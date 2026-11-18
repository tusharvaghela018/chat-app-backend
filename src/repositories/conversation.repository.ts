import BaseRepository from "@/repositories";
import Conversation from "@/models/conversations.model";
import { Op, QueryTypes } from "sequelize";
import User from "@/models/user.model";
import Message from "@/models/message.model";
import db from "@/models";

class ConversationRepository extends BaseRepository<Conversation> {
    constructor() {
        super(Conversation);
    }

    readonly getContactUserIds = async (userId: number): Promise<number[]> => {
        const conversations = await Conversation.findAll({
            where: {
                status: 'accepted',
                [Op.or]: [
                    { sender_id: userId },
                    { receiver_id: userId }
                ]
            },
            attributes: ['sender_id', 'receiver_id']
        })

        return conversations.map(c => c.sender_id === userId ? c.receiver_id : c.sender_id)
    }

    readonly findExistingConversation = async ({ senderId, receiverId }: { senderId: number, receiverId: number }) => {
        const userAttributes = ['id', 'name', 'username', 'avatar', 'is_online', 'last_seen', 'last_seen_privacy', 'avatar_privacy', 'public_key'];
        const includeUsers = [
            {
                model: User,
                as: 'sender',
                attributes: userAttributes
            },
            {
                model: User,
                as: 'receiver',
                attributes: userAttributes
            }
        ];

        return await this.findOne({
            where: {
                [Op.or]: [
                    { sender_id: senderId, receiver_id: receiverId },
                    { sender_id: receiverId, receiver_id: senderId }
                ]
            },
            include: includeUsers
        });
    }

    readonly getOrCreateConversation = async ({ senderId, receiverId }: { senderId: number, receiverId: number }) => {
        let conversation = await this.findExistingConversation({ senderId, receiverId })

        if (!conversation) {
            conversation = await this.create(
                {
                    sender_id: senderId,
                    receiver_id: receiverId,
                    status: 'pending'
                }
            )
        }

        return conversation
    }

    readonly getConversation = this.getOrCreateConversation

    readonly getConversationWithActivity = async ({ senderId, receiverId }: { senderId: number, receiverId: number }) => {
        const conversation = await this.findExistingConversation({ senderId, receiverId })
        if (!conversation) return null

        // If status is pending, verify that at least one message has been sent
        if (conversation.status === 'pending') {
            const hasMessage = await Message.findOne({
                where: { conversation_id: conversation.id },
                attributes: ['id']
            })
            if (!hasMessage) {
                return null
            }
        }

        return conversation
    }

    readonly updateStatus = async (id: number, userId: number, status: 'accepted' | 'rejected') => {
        const conversation = await this.findById(id)
        if (!conversation) throw new Error("Conversation not found")

        // Only the receiver can accept/reject the request
        if (conversation.receiver_id !== userId) {
            throw new Error("Only the recipient can accept or reject the request")
        }

        conversation.status = status
        return await conversation.save()
    }

    readonly updateBlockStatus = async (id: number, userId: number, block: boolean) => {
        const conversation = await this.findById(id)
        if (!conversation) throw new Error("Conversation not found")

        if (conversation.sender_id === userId) {
            conversation.blocked_by_sender = block
        } else if (conversation.receiver_id === userId) {
            conversation.blocked_by_receiver = block
        } else {
            throw new Error("User not part of this conversation")
        }

        return await conversation.save()
    }

    readonly updateArchiveStatus = async (id: number, userId: number, archive: boolean) => {
        const conversation = await this.findById(id)
        if (!conversation) throw new Error("Conversation not found")

        if (conversation.sender_id === userId) {
            conversation.archived_by_sender = archive
        } else if (conversation.receiver_id === userId) {
            conversation.archived_by_receiver = archive
        } else {
            throw new Error("User not part of this conversation")
        }

        return await conversation.save()
    }

    readonly getMyConversations = async (userId: number, isArchived: boolean = false) => {
        const conversations = await Conversation.findAll({
            where: {
                [Op.or]: [
                    {
                        [Op.and]: [
                            { sender_id: userId },
                            { blocked_by_sender: false },
                            { archived_by_sender: isArchived },
                        ],
                    },
                    {
                        [Op.and]: [
                            { receiver_id: userId },
                            { blocked_by_receiver: false },
                            { archived_by_receiver: isArchived },
                        ],
                    },
                ],
            },
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'name', 'username', 'avatar', 'is_online', 'last_seen', 'last_seen_privacy', 'avatar_privacy', 'public_key']
                },
                {
                    model: User,
                    as: 'receiver',
                    attributes: ['id', 'name', 'username', 'avatar', 'is_online', 'last_seen', 'last_seen_privacy', 'avatar_privacy', 'public_key']
                }
            ],
            order: [['updated_at', 'DESC']]
        })

        if (!conversations || conversations.length === 0) {
            return []
        }

        const convIds = conversations.map(c => c.id)
        const senderConvIds = conversations.filter(c => c.sender_id === userId).map(c => c.id)
        const receiverConvIds = conversations.filter(c => c.receiver_id === userId).map(c => c.id)

        // Batch 1: Fetch the latest message for every conversation in a single query
        const latestMessages: Message[] = await db.query(
            `SELECT DISTINCT ON (m.conversation_id) m.*
             FROM messages m
             WHERE m.conversation_id IN (:convIds)
               AND m.deleted_at IS NULL
               AND (
                 (m.conversation_id IN (:senderConvIds) AND m.is_hidden_for_sender_id = false)
                 OR
                 (m.conversation_id IN (:receiverConvIds) AND m.is_hidden_for_receiver_id = false)
               )
             ORDER BY m.conversation_id, m.id DESC`,
            {
                replacements: {
                    convIds,
                    senderConvIds: senderConvIds.length > 0 ? senderConvIds : [-1],
                    receiverConvIds: receiverConvIds.length > 0 ? receiverConvIds : [-1],
                },
                type: QueryTypes.SELECT,
                model: Message,
                mapToModel: true,
            }
        )

        const lastMessageMap = new Map<number, Message>()
        for (const msg of latestMessages) {
            lastMessageMap.set(msg.conversation_id, msg)
        }

        // Batch 2: Fetch unread counts for all conversations in a single grouped query
        const unreadCountsRaw: Array<{ conversation_id: number; count: string | number }> = await db.query(
            `SELECT m.conversation_id, COUNT(m.id)::int AS count
             FROM messages m
             WHERE m.conversation_id IN (:convIds)
               AND m.sender_id != :userId
               AND m.is_seen = false
               AND m.deleted_at IS NULL
               AND (
                 (m.conversation_id IN (:senderConvIds) AND m.is_hidden_for_sender_id = false)
                 OR
                 (m.conversation_id IN (:receiverConvIds) AND m.is_hidden_for_receiver_id = false)
               )
             GROUP BY m.conversation_id`,
            {
                replacements: {
                    convIds,
                    userId,
                    senderConvIds: senderConvIds.length > 0 ? senderConvIds : [-1],
                    receiverConvIds: receiverConvIds.length > 0 ? receiverConvIds : [-1],
                },
                type: QueryTypes.SELECT,
            }
        )

        const unreadMap = new Map<number, number>()
        for (const row of unreadCountsRaw) {
            unreadMap.set(Number(row.conversation_id), Number(row.count))
        }

        const sanitizeUser = (u: any, convStatus?: string) => {
            if (!u) return u
            const isContact = convStatus === 'accepted'
            if (u.last_seen_privacy === "nobody" || (u.last_seen_privacy === "contacts" && !isContact)) {
                u.is_online = false
                u.last_seen = null
            }
            if (u.avatar_privacy === "nobody" || (u.avatar_privacy === "contacts" && !isContact)) {
                u.avatar = null
            }
            return u
        }

        // Map cached messages and unread counts in memory
        const convsWithMessages = conversations.map((conv) => {
            const isSender = conv.sender_id === userId
            const plainConv = conv.toJSON() as any
            const lastMessage = lastMessageMap.get(conv.id) || null
            const unreadCount = unreadMap.get(conv.id) || 0

            plainConv.messages = lastMessage ? [lastMessage] : []
            plainConv.unread_count = unreadCount
            plainConv.is_archived = isSender ? plainConv.archived_by_sender : plainConv.archived_by_receiver
            plainConv.sender = sanitizeUser(plainConv.sender, plainConv.status)
            plainConv.receiver = sanitizeUser(plainConv.receiver, plainConv.status)
            return plainConv
        })

        // Omit empty pending conversations (conversations with status 'pending' that have 0 messages)
        return convsWithMessages.filter((c) => !(c.status === 'pending' && (!c.messages || c.messages.length === 0)))
    }

    readonly getBlockedConversations = async (userId: number) => {
        return await Conversation.findAll({
            where: {
                [Op.or]: [
                    { [Op.and]: [{ sender_id: userId }, { blocked_by_sender: true }] },
                    { [Op.and]: [{ receiver_id: userId }, { blocked_by_receiver: true }] }
                ]
            },
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'name', 'username', 'avatar']
                },
                {
                    model: User,
                    as: 'receiver',
                    attributes: ['id', 'name', 'username', 'avatar']
                }
            ],
            order: [['updated_at', 'DESC']]
        })
    }
}

export default ConversationRepository;