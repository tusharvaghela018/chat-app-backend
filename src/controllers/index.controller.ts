import { NextFunction, Request, Response } from "express";
import { sendResponse } from "@/utils";
import User from "@/models/user.model";
import Group from "@/models/group.model";
import Message from "@/models/message.model";
import GroupMessage from "@/models/group-message.model";

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
}

export default IndexController;
