export interface IStarredMessage {
    id?: number;
    user_id: number;
    message_id?: number | null;
    group_message_id?: number | null;
    created_at?: Date;
    updated_at?: Date;
}
