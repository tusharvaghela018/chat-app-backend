export interface IGroupJoinRequest {
    id?: number
    group_id: number
    user_id: number
    status?: "pending" | "approved" | "rejected"
    requested_at?: Date
    reviewed_by?: number
    reviewed_at?: Date
    created_at?: Date
    updated_at?: Date
    deleted_at?: Date
}