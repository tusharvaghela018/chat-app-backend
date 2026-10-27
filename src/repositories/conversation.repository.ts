import BaseRepository from "@/repositories";
import Conversation from "@/models/conversations.model";
import { Op } from "sequelize";
import User from "@/models/user.model";
import Message from "@/models/message.model";

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

        let conversation = await this.findOne(
            {
                where: {
                    sender_id: senderId,
                    receiver_id: receiverId
                },
                include: includeUsers
            }
        )

        if (!conversation) {
            conversation = await this.findOne(
                {
                    where: {
                        sender_id: receiverId,
                        receiver_id: senderId
                    },
                    include: includeUsers
                }
            )
        }

        return conversation
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
            const count = await Message.count({ where: { conversation_id: conversation.id } })
            if (count === 0) {
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

        // For each conversation, fetch the latest non-hidden message manually to avoid Sequelize include + limit bugs
        const convsWithMessages = await Promise.all(conversations.map(async (conv) => {
            const isSender = conv.sender_id === userId
            const filterField = isSender ? 'is_hidden_for_sender_id' : 'is_hidden_for_receiver_id'

            const lastMessage = await Message.findOne({
                where: {
                    conversation_id: conv.id,
                    [filterField]: false
                },
                order: [['created_at', 'DESC']]
            })

            const plainConv = conv.toJSON() as any
            plainConv.messages = lastMessage ? [lastMessage] : []
            plainConv.is_archived = isSender ? plainConv.archived_by_sender : plainConv.archived_by_receiver
            plainConv.sender = sanitizeUser(plainConv.sender, plainConv.status)
            plainConv.receiver = sanitizeUser(plainConv.receiver, plainConv.status)
            return plainConv
        }))

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