export interface request {
    user: User;
    device: Device;
    conversation: Conversation;
    inputs: Array<Inputs>;
}
export interface User {
    user_id: string;
    profile?: UserProfile;
    access_token?: string;
}
export interface UserProfile {
    given_name: string;
    family_name: string;
    display_name: string;
}
export interface Device {
    location?: Location;
}
export interface Location {
    coordinates?: {
        latitude: number;
        longitude: number;
    };
    formatted_address?: string;
    city?: string;
    zip_code?: string;
}
export interface Conversation {
    conversation_id: string;
    type: 0 | 1 | 2 | 3 | 4;
    conversation_token: string;
}
export interface Inputs {
    intent: string;
    raw_inputs: Array<RawInputs>;
    arguments: Array<Arguments>;
}
export interface RawInputs {
    create_time: {
        seconds: number;
        nanos: number;
    };
    input_type: 0 | 1 | 2;
    query: string;
}
export interface Arguments {
    name: string;
    raw_text: string;
}
