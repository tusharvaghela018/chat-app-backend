import Conversation from "@/models/conversations.model";
import Message from "@/models/message.model";
import BaseRepository from "@/repositories";
import { Op } from "sequelize";

class MessageRepository extends BaseRepository<Message> {
    constructor() {
        super(Message)
    }

    readonly getMessages = async (senderId: number, receiverId: number, limit: number = 50, before?: number) => {

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
            return [];
        }

        // 🔒 Pending Request Privacy:
        // Recipients cannot see messages until they ACCEPT the request.
        if (conversation.status === 'pending' && conversation.receiver_id === senderId) {
            return [];
        }

        const isSender = conversation.sender_id === senderId
        const filterField = isSender ? 'is_hidden_for_sender_id' : 'is_hidden_for_receiver_id'

        const whereClause: any = {
            conversation_id: conversation?.id,
            [filterField]: false
        }

        if (before) {
            whereClause.id = { [Op.lt]: before }
        }

        return await this.findAll({
            where: whereClause,
            limit,
            order: [["id", "DESC"]],
        }).then(messages => messages.reverse())
    }
}

export default MessageRepository;