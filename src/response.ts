export type response = {
  conversation_token: string;
  expect_user_response: true;
  expected_inputs: Array<ExpectedInputs>;
} | {
  conversation_token: string;
  expect_user_response: false;
  final_response: SpeechResponse;
}

export interface ExpectedInputs {
  input_prompt: InputPrompt;
  possible_intents: Array<ExpectedIntent>;
}

export interface ExpectedIntent {
  intent: string;
  input_value_spec?: {
    permission_value_spec: {
      opt_context: string;
      permissions: Array<'NAME'|'DEVICE_PRECISE_LOCATION'|'DEVICE_COARSE_LOCATION'>;
    };
  };
}

export interface InputPrompt {
  initial_prompts: Array<SpeechResponse>;
  no_input_prompts: Array<SpeechResponse>;
}

export type SpeechResponse = { text_to_speech: string } |  { ssml: string };
