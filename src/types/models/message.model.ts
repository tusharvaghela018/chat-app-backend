export interface IMessage {
    id?: number;
    conversation_id: number;
    sender_id: number;
    content: string;
    is_seen?: boolean;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
}