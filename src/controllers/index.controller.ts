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

            // 5. Recent Activity
            // Recent 1:1 messages received
            const recentDirect = await Message.findAll({
                limit: 5,
                order: [['created_at', 'DESC']],
                include: [
                    {
                        model: Conversation,
                        required: true,
                        where: {
                            [Op.or]: [
                                { sender_id: user.id },
                                { receiver_id: user.id }
                            ]
                        }
                    },
                    {
                        model: User,
                        attributes: ['id', 'name']
                    }
                ],
                where: {
                    sender_id: { [Op.ne]: user.id }
                }
            });

            // Recent group messages in user's groups
            const userGroups = await GroupMember.findAll({
                where: { user_id: user.id },
                attributes: ['group_id']
            });
            const groupIds = userGroups.map(ug => ug.group_id);

            const recentGroup = await GroupMessage.findAll({
                limit: 5,
                order: [['created_at', 'DESC']],
                include: [
                    {
                        model: Group,
                        attributes: ['id', 'name']
                    },
                    {
                        model: User,
                        attributes: ['id', 'name']
                    }
                ],
                where: {
                    group_id: { [Op.in]: groupIds },
                    sender_id: { [Op.ne]: user.id }
                }
            });

            const activities: any[] = [];

            recentDirect.forEach(m => {
                activities.push({
                    id: `direct-${m.id}`,
                    user: (m as any).sender?.name || "Someone",
                    action: "sent you a message",
                    time: (m as any).created_at,
                    type: "message"
                });
            });

            recentGroup.forEach(m => {
                activities.push({
                    id: `group-${m.id}`,
                    user: (m as any).sender?.name || "System",
                    action: `posted in ${(m as any).group?.name || "group"}`,
                    time: (m as any).created_at,
                    type: "group"
                });
            });

            // Sort by time descending
            activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

            return sendResponse({
                res,
                statusCode: 200,
                success: true,
                message: "Welcome to the User Dashboard",
                data: {
                    user,
                    stats: {
                        last_login: (user as any).updated_at,
                        notifications: unreadDirect,
                        messages: directSent + groupSent,
                        active_chats: activeConversations + groupsJoined
                    },
                    activities: activities.slice(0, 5)
                }
            });
        } catch (error) {
            next(error);
        }
    };
}

export default IndexController;
