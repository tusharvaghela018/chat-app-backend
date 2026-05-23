export interface IConversation {
    id?: number;
    sender_id: number;
    receiver_id: number;
    status: 'pending' | 'accepted' | 'rejected';
    blocked_by_sender: boolean;
    blocked_by_receiver: boolean;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
}