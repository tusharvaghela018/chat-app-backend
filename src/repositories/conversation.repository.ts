import BaseRepository from "@/repositories";
import Conversation from "@/models/conversations.model";
import { Op } from "sequelize";
import User from "@/models/user.model";
import Message from "@/models/message.model";

class ConversationRepository extends BaseRepository<Conversation> {
    constructor() {
        super(Conversation);
    }

    readonly getConversation = async ({ senderId, receiverId }: { senderId: number, receiverId: number }) => {
        let conversation = await this.findOne(
            {
                where: {
                    sender_id: senderId,
                    receiver_id: receiverId
                }
            }
        )

        if (!conversation) {
            conversation = await this.findOne(
                {
                    where: {
                        sender_id: receiverId,
                        receiver_id: senderId
                    }
                }
            )
        }

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

        if (conversation.sender_id === userId) {            conversation.blocked_by_sender = block
        } else if (conversation.receiver_id === userId) {
            conversation.blocked_by_receiver = block
        } else {
            throw new Error("User not part of this conversation")
        }

        return await conversation.save()
    }

    readonly getMyConversations = async (userId: number) => {
        const conversations = await Conversation.findAll({
            where: {
                [Op.or]: [
                    { [Op.and]: [{ sender_id: userId }, { blocked_by_sender: false }] },
                    { [Op.and]: [{ receiver_id: userId }, { blocked_by_receiver: false }] }
                ]
            },
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'name', 'username', 'avatar', 'is_online', 'public_key']
                },
                {
                    model: User,
                    as: 'receiver',
                    attributes: ['id', 'name', 'username', 'avatar', 'is_online', 'public_key']
                }
            ],
            order: [['updated_at', 'DESC']]
        })

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
            return plainConv
        }))

        return convsWithMessages
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