const Alana = require('@alana/core');
const Platform = require('../lib/index').default;
const util = require('util');

const openHome = {
  "user": {
    "user_id": "123",
  },
  "device": {
  },
  "conversation": {
    "conversation_id": "12345667788",
    "type": "ACTIVE",
    "conversation_token": "token_it"
  },
  "inputs": [
    {
      "intent": "assistant.intent.action.MAIN",
      "raw_inputs": [
        {
          "query": "...",
          "input_type": "VOICE",
        },
      ],
      "arguments": [
      ]
    }
  ]
};

describe('text', function() {
  const bot = new Alana.default();
  bot.turnOnDebug(true);
  const platform = new Platform(bot);
  
  it('hi', function(done){
    bot.newScript()
      .dialog((incoming, response) => {
        console.log(incoming);
        response.sendText('hi');
      });

    const req = {
      body: openHome,
    }
    const res = {
      send: function(outgoing) {
        console.log(util.inspect(outgoing, { depth: null }));
        if (outgoing.expected_inputs[0].input_prompt.initial_prompts[0].text_to_speech !== 'hi') {
          return done(new Error('bad response'));
        }
        return done();
      },
      set: function(header, value) {

      }
    }
    platform.postHandler(req, res);
  });
})