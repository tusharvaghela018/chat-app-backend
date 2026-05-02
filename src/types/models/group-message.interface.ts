export interface IGroupMessage {
    id?: number
    group_id: number
    sender_id?: number
    content: string
    type?: "text" | "system"
    encrypted_keys?: any
    created_at?: Date
    updated_at?: Date
    deleted_at?: Date
}