import { Op } from "sequelize"
import BaseRepository from "@/repositories"
import GroupMessage from "@/models/group-message.model"
import GroupMessageSeen from "@/models/group-message-seen.model"
import User from "@/models/user.model"

class GroupMessageRepository extends BaseRepository<GroupMessage> {
    constructor() {
        super(GroupMessage)
    }

    // ─── Create a regular text message ───────────────────────────────────────
    readonly createMessage = async (
        groupId: number,
        senderId: number,
        content: string
    ): Promise<GroupMessage> => {
        return await this.create({
            group_id: groupId,
            sender_id: senderId,
            content,
            type: "text",
        })
    }

    // ─── Create a system message (joined, left, name changed etc.) ───────────
    readonly createSystemMessage = async (
        groupId: number,
        content: string   // e.g. "Alice joined via invite link"
    ): Promise<GroupMessage> => {
        return await this.create({
            group_id: groupId,
            sender_id: null,   // no sender for system messages
            content,
            type: "system",
        } as any)
    }

    // ─── Get messages with cursor-based pagination ───────────────────────────
    // cursor = last message id client already has
    // loads 50 messages BEFORE that cursor (scroll up to load more)
    readonly getMessages = async (
        groupId: number,
        limit: number = 50,
        before?: number   // message id cursor
    ): Promise<GroupMessage[]> => {
        const whereClause: any = { group_id: groupId }

        if (before) {
            whereClause.id = { [Op.lt]: before }
        }

        return await this.findAll({
            where: whereClause,
            limit,
            order: [["created_at", "DESC"]], // latest first
            include: [
                {
                    model: User,
                    as: "sender",
                    attributes: ["id", "name", "avatar"],
                },
                {
                    model: GroupMessageSeen,
                    as: "seenBy",
                    include: [
                        {
                            model: User,
                            as: "user",
                            attributes: ["id", "name", "avatar"],
                        },
                    ],
                },
            ],
        }).then(messages => messages.reverse()) // reverse to chronological order
    }

    // ─── Mark multiple messages as seen by a user ────────────────────────────
    // uses bulkCreate with ignoreDuplicates — safe to call multiple times
    readonly markSeenBulk = async (
        messageIds: number[],
        userId: number
    ): Promise<void> => {
        if (messageIds.length === 0) return

        const records = messageIds.map(message_id => ({
            message_id,
            user_id: userId,
            seen_at: new Date(),
        }))

        await GroupMessageSeen.bulkCreate(records as any, {
            ignoreDuplicates: true, // unique index handles this cleanly
        })
    }

    // ─── Get latest message per group (for sidebar preview) ─────────────────
    readonly getLatestMessage = async (
        groupId: number
    ): Promise<GroupMessage | null> => {
        return await this.findOne({
            where: { group_id: groupId },
            order: [["created_at", "DESC"]],
            include: [
                {
                    model: User,
                    as: "sender",
                    attributes: ["id", "name"],
                },
            ],
        })
    }
}

export default GroupMessageRepository