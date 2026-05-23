import Conversation from "@/models/conversations.model";
import Message from "@/models/message.model";
import BaseRepository from "@/repositories";
import { Op } from "sequelize";

class MessageRepository extends BaseRepository<Message> {
    constructor() {
        super(Message)
    }

    readonly getAllMessages = async (senderId: number, receiverId: number) => {

        const conversation = await Conversation.findOne({
            where: {
                sender_id: {
                    [Op.or]: [senderId, receiverId]
                },
                receiver_id: {
                    [Op.or]: [senderId, receiverId]
                }
            }
        })

        if (!conversation) {
            return;
        }

        // 🔒 Pending Request Privacy:
        // Recipients cannot see messages until they ACCEPT the request.
        if (conversation.status === 'pending' && conversation.receiver_id === senderId) {
            return [];
        }

        const isSender = conversation.sender_id === senderId
        const filterField = isSender ? 'is_hidden_for_sender_id' : 'is_hidden_for_receiver_id'

        return await this.findAll({
            where: {
                conversation_id: conversation?.id,
                [filterField]: false
            },
            order: [["created_at", "ASC"]]
        })
    }
}

export default MessageRepository;