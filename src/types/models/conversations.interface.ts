export interface IConversation {
    id?: number;
    sender_id: number;
    receiver_id: number;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
}