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

        return await this.findAll({ where: { conversation_id: conversation?.id }, order: [["created_at", "ASC"]] })
    }
}

export default MessageRepository;