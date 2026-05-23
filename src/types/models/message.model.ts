export interface IMessage {
    id?: number;
    conversation_id: number;
    sender_id: number;
    content: string;
    is_seen?: boolean;
    is_hidden_for_sender_id: boolean;
    is_hidden_for_receiver_id: boolean;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
}