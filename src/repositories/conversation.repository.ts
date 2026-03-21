import BaseRepository from "@/repositories";
import Conversation from "@/models/conversations.model";

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
                    receiver_id: receiverId
                }
            )
        }

        return conversation
    }
}

export default ConversationRepository;