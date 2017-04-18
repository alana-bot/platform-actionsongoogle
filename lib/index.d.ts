/// <reference types="express" />
/// <reference types="bluebird" />
import * as Promise from 'bluebird';
import * as Express from 'express';
import { Message } from '@alana/core/lib/types/bot';
import { PlatformMiddleware } from '@alana/core/lib/types/platform';
import { User } from '@alana/core/lib/types/user';
import Alana from '@alana/core';
import { request } from './request';
import { response } from './response';
export default class ActionsOnGoogle implements PlatformMiddleware {
    protected bot: Alana;
    private port;
    private route;
    private expressApp;
    private server;
    private responseMap;
    private intentGen;
    messageTimeoutMs: number;
    constructor(theBot: Alana, port?: number | Express.Express, route?: string);
    postHandler(req: Express.Request, res: Express.Response): void;
    start(): Promise<this>;
    stop(): Promise<this>;
    send<U extends User>(user: U, message: Message.OutgoingMessage): Promise<this>;
}
export declare function mapGoogleToInternal(message: request): Message.TextMessage | Message.GreetingMessage;
export declare function mapInternalToGoogle(message: Message.OutgoingMessage): response;
