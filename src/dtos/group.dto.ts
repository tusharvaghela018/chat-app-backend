// dtos/group.dto.ts

export interface CreateGroupDTO {
    name: string
    description?: string
    avatar?: string
    join_mode?: "open" | "approval"
    member_ids?: number[]
}

export interface UpdateGroupDTO {
    name?: string
    description?: string
    avatar?: string
    join_mode?: "open" | "approval"
}

export interface AddMemberDTO {
    user_id: number
    role?: "admin" | "member"
}

export interface UpdateMemberRoleDTO {
    role: "admin" | "member"
}

export interface UpdateGroupSettingsDTO {
    who_can_send?: "members" | "admins"
    who_can_edit_info?: "admins" | "members"
    who_can_add_members?: "admins" | "members"
    who_can_remove_members?: "admins"
    who_can_share_link?: "admins" | "members"
    who_can_change_settings?: "admins"
}

export interface ReviewJoinRequestDTO {
    status: "approved" | "rejected"
}