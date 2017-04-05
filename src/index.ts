import * as Promise from 'bluebird';
import * as bodyParser from 'body-parser';
import * as Express from 'express';
import * as http from 'http';
import * as _ from 'lodash';
import * as util from 'util';
import * as uuid from 'uuid';

import { Message, IntentGenerator, Intent } from '@alana/core/lib/types/bot';
import * as Bot from '@alana/core/lib/types/bot';
import * as Messages from '@alana/core/lib/types/message';
import { PlatformMiddleware } from '@alana/core/lib/types/platform';
import { BasicUser, User } from '@alana/core/lib/types/user';

import Alana from '@alana/core';

import { request, Inputs } from './request';
import { response, SpeechResponse } from './response';

class Intenter extends IntentGenerator {
  public intentMap: { [message_id: string]: Inputs } = {};
  public getIntents(message: Messages.IncomingMessage): Promise<Array<Intent>> {
    if (this.intentMap[message.id]) {
      const intent: Intent = {
        domain: 'ActionsOnGoogle',
        action: this.intentMap[message.id].intent,
        details: {
          confidence: 1,
          arguments: this.intentMap[message.id].arguments
        },
      }
      return Promise.resolve([intent])
    }
  }
}

// defined at https://developers.google.com/actions/reference/conversation 
export default class ActionsOnGoogle implements PlatformMiddleware  {
  protected bot: Alana;
  private port: number;
  private route: string;
  private expressApp: Express.Express;
  private server: http.Server = null;
  private responseMap: { [conversation_id: string]: {
    res: Express.Response;
    token: string;
    messages: Array<Messages.OutgoingMessage>;
    promise: Promise<any>;
  }} = {};
  private intentGen: Intenter = new Intenter();
  public messageTimeoutMs = 200;

  constructor(theBot: Alana, port: number = 3000, route: string = '/webhook') {
    this.bot = theBot;
    this.bot.addPlatform(this);
    this.bot.addIntent(this.intentGen);
    this.port = port;
    this.route = route;
    this.expressApp = Express();
    this.expressApp.use(bodyParser.json());
    this.expressApp.post(this.route, this.postHandler.bind(this))
    return this;
  }

  public postHandler(req: Express.Request, res: Express.Response) {
    const rawMessage: request = req.body;
    if (this.bot.debugOn) {
      console.log(`Recieved message`);
      console.log(util.inspect(rawMessage, { depth: null }));
    }
    const message: Message.IncomingMessage = mapGoogleToInternal(rawMessage);
    if (message !== null) {
      const user: BasicUser = {
        _platform: this,
        id: rawMessage.user.user_id,
        platform: 'ActionsOnGoogle',
      };
      
      if (this.bot.debugOn) {
        console.log(`Processing ${message.type} message for ${user.id}`);
      }
      this.responseMap[message.conversation_id] = {
        res: res,
        token: rawMessage.conversation.conversation_token,
        messages: [],
        promise: null,
      };
      this.intentGen.intentMap[message.id] = rawMessage.inputs[0];
      this.bot.processMessage(user, message);
    }
  }

  public start() {
    this.server = this.expressApp.listen(this.port, () => {
      if (this.bot.debugOn) {
        console.log(`ActionsOnGoogle platform listening at http://localhost:${this.port}${this.route}`);
      }
    });
    return Promise.resolve(this);
  }

  public stop() {
    this.server.close(() => {
      if (this.bot.debugOn) {
        console.log('ActionsOnGoogle platform stopped');
      }
    });
    this.server = null;
    return Promise.resolve(this);
  }

  public send<U extends User>(user: U, message: Message.OutgoingMessage): Promise<this> {
    if (!this.responseMap[message.conversation_id]) {
      throw new Error('can only respond with 1 message, use SSML markup');
    }
    const response = this.responseMap[message.conversation_id];
    const res = response.res;
    if (!response.promise) {
      response.promise = Promise.delay(this.messageTimeoutMs).then(() => {
        let googleMessage: response;
        if (response.messages.length > 1) {
          const textMessages = response.messages.filter(message => message.type === 'text').filter((message: Messages.TextMessage) => isSSML(message.text) === false) as Messages.TextMessage[];
          const concated = `<speak>${textMessages.map(message => `<p>${message.text}</p>`).join('')}</speak>`
          googleMessage = mapInternalToGoogle({
            type: 'text',
            text: concated,
            conversation_id: message.conversation_id,
            id: uuid.v4(),
          } as Messages.TextMessage);
        } else {
          googleMessage = mapInternalToGoogle(response.messages[0]);
        }
        googleMessage.conversation_token = response.token;
        res.set("Google-Assistant-API-Version", "v1").send(googleMessage);
        delete this.responseMap[message.conversation_id];
      });
    }
    response.messages.push(message);
    return Promise.resolve(this);
  }
}

export function mapGoogleToInternal(message: request): Message.TextMessage | Message.GreetingMessage {
  if (message.inputs[0].intent === 'assistant.intent.action.MAIN') {
    return {
      type: 'greeting',
      id: uuid.v4(),
      conversation_id: message.conversation.conversation_id,
    };
  }
  return {
    type: 'text',
    text: message.inputs[0].raw_inputs[0].query,
    id: uuid.v4(),
    conversation_id: message.conversation.conversation_id,
  } as Message.TextMessage;
}

export function mapInternalToGoogle(message: Message.OutgoingMessage): response {
  switch (message.type) {
    case 'text':
      const itIsSSML = isSSML(message.text);
      const converted: SpeechResponse = itIsSSML ? { ssml: message.text } : { text_to_speech: message.text };
      return {
        conversation_token: null,
        expect_user_response: true,
        expected_inputs: [{
          input_prompt: {
            initial_prompts: [ converted ],
            no_input_prompts: [ converted ],
          },
          possible_intents: [{
            intent: 'assistant.intent.action.TEXT'
          }],
        }]
      } as response

    default:
      return null;
  }
}

function isSSML(text: string): boolean {
  return /^<speak\b[^>]*>([^]*?)<\/speak>$/gi.test(text);
}