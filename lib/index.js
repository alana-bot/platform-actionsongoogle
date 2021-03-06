"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Promise = require("bluebird");
var bodyParser = require("body-parser");
var Express = require("express");
var _ = require("lodash");
var util = require("util");
var uuid = require("uuid");
var bot_1 = require("@alana/core/lib/types/bot");
var Intenter = (function (_super) {
    __extends(Intenter, _super);
    function Intenter() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.intentMap = {};
        return _this;
    }
    Intenter.prototype.getIntents = function (message) {
        if (this.intentMap[message.id]) {
            var intent = {
                domain: 'ActionsOnGoogle',
                action: this.intentMap[message.id].intent,
                details: {
                    confidence: this.intentMap[message.id].intent !== 'assistant.intent.action.TEXT' ? 1 : 0,
                    arguments: this.intentMap[message.id].arguments
                },
            };
            return Promise.resolve([intent]);
        }
    };
    return Intenter;
}(bot_1.IntentGenerator));
// defined at https://developers.google.com/actions/reference/conversation
var ActionsOnGoogle = (function () {
    function ActionsOnGoogle(theBot, port, route) {
        if (port === void 0) { port = 3000; }
        if (route === void 0) { route = '/webhook'; }
        var _this = this;
        this.server = null;
        this.responseMap = {};
        this.intentGen = new Intenter();
        this.messageTimeoutMs = 50;
        this.bot = theBot;
        this.bot.addPlatform(this);
        this.bot.addIntent(this.intentGen);
        console.log(_.isNumber(port));
        if (_.isNumber(port)) {
            this.port = port;
            this.expressApp = Express();
            this.expressApp.use(bodyParser.json());
        }
        else {
            this.expressApp = port;
        }
        this.route = route;
        this.expressApp.post(this.route, function (req, res) { return _this.postHandler(req, res); });
        return this;
    }
    ActionsOnGoogle.prototype.postHandler = function (req, res, args) {
        if (args === void 0) { args = {}; }
        var rawMessage = req.body;
        if (this.bot.debugOn) {
            console.log("Recieved message");
            console.log(util.inspect(rawMessage, { depth: null }));
        }
        var message = mapGoogleToInternal(rawMessage);
        if (message === null) {
            return Promise.reject(new Error('Bad message'));
        }
        var user = {
            _platform: this,
            id: rawMessage.user.user_id,
            platform: 'ActionsOnGoogle',
        };
        if (this.bot.debugOn) {
            console.log("Processing " + message.type + " message for " + user.id);
        }
        this.responseMap[message.conversation_id] = {
            res: res,
            token: rawMessage.conversation.conversation_token,
            messages: [],
            promise: null,
        };
        this.intentGen.intentMap[message.id] = rawMessage.inputs[0];
        if (rawMessage.inputs[0].intent !== 'assistant.intent.action.TEXT') {
            args.intents = convertAONGIntent(rawMessage.inputs);
        }
        else {
            args.intents = [];
        }
        return this.processMessage(user, message, args);
    };
    ActionsOnGoogle.prototype.processMessage = function (user, message, args) {
        return this.bot.processMessage(user, message);
    };
    ActionsOnGoogle.prototype.start = function () {
        var _this = this;
        if (this.port) {
            this.server = this.expressApp.listen(this.port, function () {
                if (_this.bot.debugOn) {
                    console.log("ActionsOnGoogle platform listening at http://localhost:" + _this.port + _this.route);
                }
            });
        }
        else {
            if (this.bot.debugOn) {
                console.log("ActionsOnGoogle platform listening at " + this.route);
            }
        }
        return Promise.resolve(this);
    };
    ActionsOnGoogle.prototype.stop = function () {
        var _this = this;
        if (this.port) {
            this.server.close(function () {
                if (_this.bot.debugOn) {
                    console.log('ActionsOnGoogle platform stopped');
                }
            });
            this.server = null;
        }
        return Promise.resolve(this);
    };
    ActionsOnGoogle.prototype.send = function (user, message) {
        var _this = this;
        if (!this.responseMap[message.conversation_id]) {
            throw new Error('can only respond with 1 message, use SSML markup');
        }
        var response = this.responseMap[message.conversation_id];
        var res = response.res;
        if (!response.promise) {
            response.promise = Promise.delay(this.messageTimeoutMs).then(function () {
                var googleMessage;
                if (response.messages.length > 1) {
                    var textMessages = response.messages
                        .filter(function (message) { return message.type === 'text'; })
                        .filter(function (message) { return isSSML(message.text) === false; });
                    var concated = "<speak>" + textMessages.map(function (message) { return "<p>" + message.text + "</p>"; }).join('') + "</speak>";
                    googleMessage = mapInternalToGoogle({
                        type: 'text',
                        text: concated,
                        conversation_id: message.conversation_id,
                        id: uuid.v4(),
                    });
                }
                else {
                    googleMessage = mapInternalToGoogle(response.messages[0]);
                }
                googleMessage.conversation_token = response.token;
                res.set('Google-Assistant-API-Version', 'v1').send(googleMessage);
                delete _this.responseMap[message.conversation_id];
            });
        }
        response.messages.push(message);
        return Promise.resolve(this);
    };
    return ActionsOnGoogle;
}());
exports.default = ActionsOnGoogle;
function convertAONGIntent(inputs) {
    return inputs.map(function (input) {
        var alanaIntent = {
            domain: 'ActionsOnGoogle',
            action: input.intent,
            details: {
                confidence: input.intent !== 'assistant.intent.action.TEXT' ? 1 : 0,
                arguments: input.arguments
            },
        };
        return alanaIntent;
    });
}
exports.convertAONGIntent = convertAONGIntent;
function mapGoogleToInternal(message) {
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
    };
}
exports.mapGoogleToInternal = mapGoogleToInternal;
function mapInternalToGoogle(message) {
    switch (message.type) {
        case 'text':
            var itIsSSML = isSSML(message.text);
            var converted = itIsSSML ? { ssml: message.text } : { text_to_speech: message.text };
            return {
                conversation_token: null,
                expect_user_response: true,
                expected_inputs: [{
                        input_prompt: {
                            initial_prompts: [converted],
                            no_input_prompts: [converted],
                        },
                        possible_intents: [{
                                intent: 'assistant.intent.action.TEXT'
                            }],
                    }]
            };
        default:
            return null;
    }
}
exports.mapInternalToGoogle = mapInternalToGoogle;
function isSSML(text) {
    return /^<speak\b[^>]*>([^]*?)<\/speak>$/gi.test(text);
}
