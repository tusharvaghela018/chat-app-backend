export interface IGroupSetting {
    id?: number
    group_id: number
    who_can_send?: "members" | "admins"
    who_can_edit_info?: "admins" | "members"
    who_can_add_members?: "admins" | "members"
    who_can_remove_members?: "admins"
    who_can_share_link?: "admins" | "members"
    who_can_change_settings?: "admins"
    created_at?: Date
    updated_at?: Date
    deleted_at?: Date
}