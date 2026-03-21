export interface IGroupMember {
    id?: number
    group_id: number
    user_id: number
    role?: "admin" | "member"
    added_by?: number
    joined_at?: Date
    last_read_at?: Date
    created_at?: Date
    updated_at?: Date
    deleted_at?: Date
}