export interface IMessageReaction {
    id?: number;
    message_id: number;
    user_id: number;
    emoji: string;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
}

export interface IGroupMessageReaction {
    id?: number;
    group_message_id: number;
    user_id: number;
    emoji: string;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
}
