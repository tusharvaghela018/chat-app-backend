export interface IGroup {
    id?: number
    name: string
    description?: string
    avatar?: string
    created_by: number
    invite_token?: string
    invite_expires_at?: Date
    join_mode?: "open" | "approval"
    created_at?: Date
    updated_at?: Date
    deleted_at?: Date
}