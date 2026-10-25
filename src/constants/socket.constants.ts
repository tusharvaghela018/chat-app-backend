// constants/socket.events.ts

export const CHAT_EVENTS = {
    // Client → Server
    SEND_MESSAGE: "send_message",
    MARK_SEEN: "mark_seen",
    TOGGLE_REACTION: "toggle_reaction",
    TOGGLE_STAR: "toggle_star",

    // Server → Client
    RECEIVE_MESSAGE: "receive_message",
    MESSAGES_SEEN: "messages_seen",
    REACTION_UPDATED: "reaction_updated",
    STAR_UPDATED: "star_updated",

    TYPING_START: "typing_start",    // ← add
    TYPING_STOP: "typing_stop",     // ← add
    TYPING: "typing",
    ERROR: "error",
    CONVERSATION_STATUS_UPDATED: "conversation_status_updated",
    NEW_REQUEST: "new_request",
    USER_STATUS: "user_status",
    ONLINE_USERS: "online_users",
} as const

export const GROUP_EVENTS = {
    // Client → Server
    SEND_MESSAGE: "group_send_message",
    MARK_SEEN: "group_mark_seen",
    TOGGLE_REACTION: "group_toggle_reaction",
    TOGGLE_STAR: "group_toggle_star",
    TYPING_START: "group_typing_start",
    TYPING_STOP: "group_typing_stop",

    // Server → Client
    RECEIVE_MESSAGE: "group_receive_message",
    REACTION_UPDATED: "group_reaction_updated",
    STAR_UPDATED: "group_star_updated",
    TYPING: "group_typing",
    SEEN_UPDATE: "group_seen_update",
    MEMBER_JOINED: "group_member_joined",
    MEMBER_LEFT: "group_member_left",
    JOIN_REQUEST: "group_join_request",
    NOTIFICATION: "group_notification",
    ERROR: "group_error",
} as const

export const JOIN_MODES = {
    OPEN: 'open',
    APPROVAL: 'approval'
} as const

export const CALL_EVENTS = {
    // Calling initiation & response
    INITIATE: "call:initiate",
    INCOMING: "call:incoming",
    ACCEPT: "call:accept",
    ACCEPTED: "call:accepted",
    REJECT: "call:reject",
    REJECTED: "call:rejected",
    END: "call:end",
    ENDED: "call:ended",
    UNAVAILABLE: "call:unavailable",

    // WebRTC Signaling
    OFFER: "call:offer",
    ANSWER: "call:answer",
    ICE_CANDIDATE: "call:ice-candidate",

    // In-call state changes
    TOGGLE_MEDIA: "call:toggle-media",
    MEDIA_TOGGLED: "call:media-toggled"
} as const

export type ChatEvent = typeof CHAT_EVENTS[keyof typeof CHAT_EVENTS]
export type GroupEvent = typeof GROUP_EVENTS[keyof typeof GROUP_EVENTS]
export type CallEvent = typeof CALL_EVENTS[keyof typeof CALL_EVENTS]