import crypto from "crypto"
import { Transaction } from "sequelize"
import BaseRepository from "@/repositories"
import Group from "@/models/group.model"
import GroupSetting from "@/models/group-setting.model"
import GroupMember from "@/models/group-member.model"
import User from "@/models/user.model"
import AppError from "@/utils/appError"
import { CreateGroupDTO, UpdateGroupDTO } from "@/dtos/group.dto"
import db from "@/models"

class GroupRepository extends BaseRepository<Group> {
    constructor() {
        super(Group)
    }

    // ─── Create group + settings + add creator as admin (one transaction) ───
    readonly createWithSettings = async (
        userId: number,
        data: CreateGroupDTO
    ): Promise<Group> => {
        const transaction: Transaction = await db.transaction()

        try {
            // 1. create the group
            const group = await this.create(
                {
                    ...data,
                    created_by: userId,
                },
                { transaction }
            )

            // 2. create default settings for the group
            await GroupSetting.create(
                { group_id: group.id },
                { transaction }
            )

            // 3. add creator as admin member
            await GroupMember.create(
                {
                    group_id: group.id,
                    user_id: userId,
                    role: "admin",
                    added_by: null,
                },
                { transaction }
            )

            await transaction.commit()
            return group
        } catch (error) {
            await transaction.rollback()
            throw error
        }
    }

    // ─── Get all groups a user belongs to (with unread count) ───────────────
    readonly findAllByUserId = async (userId: number): Promise<Group[]> => {
        return await this.findAll({
            include: [
                {
                    model: GroupMember,
                    as: "members",
                    where: { user_id: userId },  // only groups this user is in
                    attributes: ["role", "last_read_at"],
                },
                {
                    model: User,
                    as: "creator",
                    attributes: ["id", "name", "avatar"],
                },
                {
                    model: GroupSetting,
                    as: "settings",
                },
            ],
        })
    }

    // ─── Get single group with full details ──────────────────────────────────
    readonly findByIdWithDetails = async (groupId: number): Promise<Group> => {
        const group = await this.findOne({
            where: { id: groupId },
            include: [
                {
                    model: GroupMember,
                    as: "members",
                    include: [
                        {
                            model: User,
                            as: "user",
                            attributes: ["id", "name", "avatar", "is_online"],
                        },
                    ],
                },
                {
                    model: GroupSetting,
                    as: "settings",
                },
                {
                    model: User,
                    as: "creator",
                    attributes: ["id", "name", "avatar"],
                },
            ],
        })

        if (!group) throw new AppError("Group not found", 404)
        return group
    }

    // ─── Generate a fresh invite token ───────────────────────────────────────
    readonly generateInviteToken = async (
        groupId: number,
        expiresInHours?: number  // undefined = never expires
    ): Promise<string> => {
        const token = crypto.randomUUID()

        const expiresAt = expiresInHours
            ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
            : null

        await this.update(
            { invite_token: token, invite_expires_at: expiresAt } as any,
            { where: { id: groupId } }
        )

        return token
    }

    // ─── Find group by invite token (for join via link) ──────────────────────
    readonly findByInviteToken = async (token: string): Promise<Group> => {
        const group = await this.findOne({
            where: { invite_token: token },
            include: [
                {
                    model: GroupSetting,
                    as: "settings",
                },
                {
                    model: GroupMember,
                    as: "members",
                    attributes: ["id"], // just need count
                },
            ],
        })

        if (!group) throw new AppError("Invalid or expired invite link", 404)

        // check expiry if set
        if (
            group.invite_expires_at &&
            new Date() > new Date(group.invite_expires_at)
        ) {
            throw new AppError("This invite link has expired", 410)
        }

        return group
    }

    // ─── Update group info ───────────────────────────────────────────────────
    readonly updateGroup = async (
        groupId: number,
        data: UpdateGroupDTO
    ): Promise<void> => {
        await this.update(data as any, { where: { id: groupId } })
    }

    // ─── Soft delete group ───────────────────────────────────────────────────
    readonly deleteGroup = async (groupId: number): Promise<void> => {
        await this.delete({ where: { id: groupId } })
    }
}

export default GroupRepository