import { NextFunction, Request, Response } from "express";
import { sendResponse } from "@/utils";
import User from "@/models/user.model";
import Group from "@/models/group.model";
import Message from "@/models/message.model";
import GroupMessage from "@/models/group-message.model";
import Conversation from "@/models/conversations.model";
import GroupMember from "@/models/group-member.model";
import { Op } from "sequelize";

class IndexController {
    public home = async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Home page is public - both logged-in and guest users can see it
            const user = req.user; // If logged in, this will be defined by passport

            // Real stats for home page
            const totalUsers = await User.count();
            const totalGroups = await Group.count();
            const totalDirectMessages = await Message.count();
            const totalGroupMessages = await GroupMessage.count();

            return sendResponse({
                res,
                statusCode: 200,
                success: true,
                message: "Welcome to the Home Page",
                data: {
                    user: user || null,
                    is_authenticated: !!user,
                    info: `Welcome to NexusApp! We have a growing community of ${totalUsers} users and ${totalGroups} active groups.`,
                    stats: {
                        users: totalUsers,
                        groups: totalGroups,
                        messages: totalDirectMessages + totalGroupMessages
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    };

    public dashboard = async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Dashboard is protected - req.user is guaranteed by AuthMiddleware
            const user = req.user as User;

            // 1. Total messages sent by this user
            const directSent = await Message.count({ where: { sender_id: user.id } });
            const groupSent = await GroupMessage.count({ where: { sender_id: user.id } });

            // 2. Active conversations (1:1)
            const activeConversations = await Conversation.count({
                where: {
                    [Op.or]: [
                        { sender_id: user.id },
                        { receiver_id: user.id }
                    ]
                }
            });

            // 3. Groups joined
            const groupsJoined = await GroupMember.count({ where: { user_id: user.id } });

            // 4. Unread messages (1:1)
            const unreadDirect = await Message.count({
                where: {
                    sender_id: { [Op.ne]: user.id },
                    is_seen: false
                },
                include: [{
                    model: Conversation,
                    required: true,
                    where: {
                        [Op.or]: [
                            { sender_id: user.id },
                            { receiver_id: user.id }
                        ]
                    }
                }]
            });

            return sendResponse({
                res,
                statusCode: 200,
                success: true,
                message: "Welcome to the User Dashboard",
                data: {
                    user,
                    stats: {
                        last_login: (user as any).updated_at, // Use updated_at as a proxy if last_login isn't tracked
                        notifications: unreadDirect,
                        messages: directSent + groupSent,
                        active_chats: activeConversations + groupsJoined
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    };
}

export default IndexController;
