import BaseRepository from "@/repositories"
import GroupMember from "@/models/group-member.model"
import User from "@/models/user.model"
import AppError from "@/utils/appError"
import { AddMemberDTO, UpdateMemberRoleDTO } from "@/dtos/group.dto"

class GroupMemberRepository extends BaseRepository<GroupMember> {
    constructor() {
        super(GroupMember)
    }

    // ─── Check if user is a member ───────────────────────────────────────────
    readonly isMember = async (
        groupId: number,
        userId: number
    ): Promise<GroupMember | null> => {
        return await this.findOne({
            where: { group_id: groupId, user_id: userId },
        })
    }

    // ─── Check if user is an admin ───────────────────────────────────────────
    readonly isAdmin = async (
        groupId: number,
        userId: number
    ): Promise<boolean> => {
        const member = await this.findOne({
            where: { group_id: groupId, user_id: userId, role: "admin" },
        })
        return !!member
    }

    // ─── Add a member to group ───────────────────────────────────────────────
    readonly addMember = async (
        groupId: number,
        addedBy: number | null,    // null = joined via invite link
        data: AddMemberDTO
    ): Promise<GroupMember> => {
        // check not already a member
        const existing = await this.isMember(groupId, data.user_id)
        if (existing) throw new AppError("User is already a member of this group", 400)

        return await this.create({
            group_id: groupId,
            user_id: data.user_id,
            role: data.role ?? "member",
            added_by: addedBy,
        } as any)
    }

    // ─── Remove a member ─────────────────────────────────────────────────────
    readonly removeMember = async (
        groupId: number,
        userId: number
    ): Promise<void> => {
        const member = await this.isMember(groupId, userId)
        if (!member) throw new AppError("User is not a member of this group", 404)

        await this.delete({ where: { group_id: groupId, user_id: userId } })
    }

    // ─── Update role (promote / demote) ──────────────────────────────────────
    readonly updateRole = async (
        groupId: number,
        userId: number,
        data: UpdateMemberRoleDTO
    ): Promise<void> => {
        const member = await this.isMember(groupId, userId)
        if (!member) throw new AppError("User is not a member of this group", 404)

        // safety: always keep at least one admin
        if (data.role === "member") {
            const adminCount = await this.count({
                where: { group_id: groupId, role: "admin" },
            })
            if (adminCount <= 1) {
                throw new AppError("Group must have at least one admin", 400)
            }
        }

        await this.update(
            { role: data.role },
            { where: { group_id: groupId, user_id: userId } }
        )
    }

    // ─── Update last_read_at (called when user opens the group) ─────────────
    readonly updateLastReadAt = async (
        groupId: number,
        userId: number
    ): Promise<void> => {
        await this.update(
            { last_read_at: new Date() } as any,
            { where: { group_id: groupId, user_id: userId } }
        )
    }

    // ─── Get unread message count for a user in a group ──────────────────────
    readonly getUnreadCount = async (
        groupId: number,
        userId: number
    ): Promise<number> => {
        const member = await this.isMember(groupId, userId)
        if (!member || !member.last_read_at) return 0

        // import GroupMessage inline to avoid circular dependency
        const GroupMessage = (await import("@/models/group-message.model")).default
        const { Op } = await import("sequelize")

        return await GroupMessage.count({
            where: {
                group_id: groupId,
                created_at: { [Op.gt]: member.last_read_at },
                sender_id: { [Op.ne]: userId }, // don't count own messages
            },
        })
    }

    // ─── Get all members of a group with user info ───────────────────────────
    readonly getMembersWithUser = async (groupId: number): Promise<GroupMember[]> => {
        return await this.findAll({
            where: { group_id: groupId },
            include: [
                {
                    model: User,
                    as: "user",
                    attributes: ["id", "name", "avatar", "is_online"],
                },
            ],
        })
    }
}

export default GroupMemberRepository