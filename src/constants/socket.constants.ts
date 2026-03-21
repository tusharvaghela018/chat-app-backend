// constants/socket.events.ts

export const CHAT_EVENTS = {
    // Client → Server
    SEND_MESSAGE: "send_message",
    MARK_SEEN: "mark_seen",

    // Server → Client
    RECEIVE_MESSAGE: "receive_message",
    MESSAGES_SEEN: "messages_seen",

    TYPING_START: "typing_start",    // ← add
    TYPING_STOP: "typing_stop",     // ← add
    TYPING: "typing"
} as const

export const GROUP_EVENTS = {
    // Client → Server
    SEND_MESSAGE: "group_send_message",
    MARK_SEEN: "group_mark_seen",
    TYPING_START: "group_typing_start",
    TYPING_STOP: "group_typing_stop",
    JOIN_ROOM: "group_join_room",

    // Server → Client
    RECEIVE_MESSAGE: "group_receive_message",
    TYPING: "group_typing",
    SEEN_UPDATE: "group_seen_update",
    MEMBER_JOINED: "group_member_joined",
    MEMBER_LEFT: "group_member_left",
    JOIN_REQUEST: "group_join_request",
    ERROR: "group_error",
} as const

export type ChatEvent = typeof CHAT_EVENTS[keyof typeof CHAT_EVENTS]
export type GroupEvent = typeof GROUP_EVENTS[keyof typeof GROUP_EVENTS]