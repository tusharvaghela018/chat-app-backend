import StarredMessage from "@/models/starred-message.model";
import Message from "@/models/message.model";
import GroupMessage from "@/models/group-message.model";
import User from "@/models/user.model";
import Group from "@/models/group.model";
import Conversation from "@/models/conversations.model";

export class StarredMessageRepository {
    readonly toggleStar = async (
        userId: number,
        options: { messageId?: number; groupMessageId?: number }
    ) => {
        const { messageId, groupMessageId } = options;

        if (!messageId && !groupMessageId) {
            throw new Error("Either messageId or groupMessageId must be provided");
        }

        const whereClause: any = { user_id: userId };
        if (messageId) {
            whereClause.message_id = messageId;
        } else if (groupMessageId) {
            whereClause.group_message_id = groupMessageId;
        }

        const existing = await StarredMessage.findOne({ where: whereClause });

        if (existing) {
            await existing.destroy();
            return {
                isStarred: false,
                messageId: messageId || null,
                groupMessageId: groupMessageId || null,
            };
        }

        const created = await StarredMessage.create({
            user_id: userId,
            message_id: messageId || null,
            group_message_id: groupMessageId || null,
        });

        return {
            isStarred: true,
            starred: created,
            messageId: messageId || null,
            groupMessageId: groupMessageId || null,
        };
    };

    readonly getStarredMessages = async (userId: number) => {
        const records = await StarredMessage.findAll({
            where: { user_id: userId },
            order: [["created_at", "DESC"]],
            include: [
                {
                    model: Message,
                    as: "message",
                    required: false,
                    include: [
                        {
                            model: User,
                            as: "sender",
                            attributes: ["id", "name", "avatar", "public_key"],
                        },
                        {
                            model: Conversation,
                            as: "conversation",
                            include: [
                                {
                                    model: User,
                                    as: "sender",
                                    attributes: ["id", "name", "avatar", "public_key"],
                                },
                                {
                                    model: User,
                                    as: "receiver",
                                    attributes: ["id", "name", "avatar", "public_key"],
                                },
                            ],
                        },
                    ],
                },
                {
                    model: GroupMessage,
                    as: "groupMessage",
                    required: false,
                    include: [
                        {
                            model: User,
                            as: "sender",
                            attributes: ["id", "name", "avatar"],
                        },
                        {
                            model: Group,
                            as: "group",
                            attributes: ["id", "name", "avatar"],
                        },
                    ],
                },
            ],
        });

        return records.map((item) => {
            const isDirect = !!item.message_id;
            if (isDirect && item.message) {
                const conv = item.message.conversation;
                const otherUser =
                    conv?.sender_id === userId ? conv?.receiver : conv?.sender;

                return {
                    id: item.id,
                    type: "direct" as const,
                    message_id: item.message_id,
                    content: item.message.content,
                    created_at: item.message.created_at,
                    starred_at: item.created_at,
                    sender: item.message.sender,
                    conversation_id: item.message.conversation_id,
                    chat: {
                        type: "direct" as const,
                        id: otherUser?.id,
                        name: otherUser?.name || "Direct Chat",
                        avatar: otherUser?.avatar,
                        other_user: otherUser,
                    },
                };
            }

            if (!isDirect && item.groupMessage) {
                return {
                    id: item.id,
                    type: "group" as const,
                    group_message_id: item.group_message_id,
                    content: item.groupMessage.content,
                    created_at: item.groupMessage.created_at,
                    starred_at: item.created_at,
                    sender: item.groupMessage.sender,
                    group_id: item.groupMessage.group_id,
                    chat: {
                        type: "group" as const,
                        id: item.groupMessage.group?.id,
                        name: item.groupMessage.group?.name || "Group Chat",
                        avatar: item.groupMessage.group?.avatar,
                        group: item.groupMessage.group,
                    },
                };
            }

            return {
                id: item.id,
                type: isDirect ? ("direct" as const) : ("group" as const),
                message_id: item.message_id,
                group_message_id: item.group_message_id,
                content: "",
                created_at: item.created_at,
                starred_at: item.created_at,
                sender: null,
                chat: null,
            };
        });
    };

    readonly getStarredIds = async (userId: number) => {
        const records = await StarredMessage.findAll({
            where: { user_id: userId },
            attributes: ["message_id", "group_message_id"],
        });

        const directMessageIds: number[] = [];
        const groupMessageIds: number[] = [];

        records.forEach((r) => {
            if (r.message_id) directMessageIds.push(r.message_id);
            if (r.group_message_id) groupMessageIds.push(r.group_message_id);
        });

        return { directMessageIds, groupMessageIds };
    };
}

export default new StarredMessageRepository();
