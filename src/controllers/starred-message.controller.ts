import { Request, Response } from "express";
import asyncHandler, { sendResponse } from "@/utils";
import User from "@/models/user.model";
import starredMessageRepository from "@/repositories/starred-message.repository";
import SocketServer from "@/config/Socket";

class StarredMessageController {
    readonly toggleStar = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req.user as User).id;
        const { messageId, groupMessageId } = req.body;

        const result = await starredMessageRepository.toggleStar(userId, {
            messageId: messageId ? Number(messageId) : undefined,
            groupMessageId: groupMessageId ? Number(groupMessageId) : undefined,
        });

        SocketServer.getInstance().notifyStarUpdated(userId, {
            messageId: messageId ? Number(messageId) : undefined,
            groupMessageId: groupMessageId ? Number(groupMessageId) : undefined,
            isStarred: result.isStarred,
        });

        return sendResponse({
            res,
            data: result,
            message: result.isStarred
                ? "Message starred successfully"
                : "Message unstarred successfully",
            success: true,
        });
    });

    readonly getStarredMessages = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req.user as User).id;
        const starred = await starredMessageRepository.getStarredMessages(userId);

        return sendResponse({
            res,
            data: starred,
            message: "Starred messages fetched successfully",
            success: true,
        });
    });

    readonly getStarredIds = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req.user as User).id;
        const ids = await starredMessageRepository.getStarredIds(userId);

        return sendResponse({
            res,
            data: ids,
            message: "Starred message IDs fetched successfully",
            success: true,
        });
    });
}

export default StarredMessageController;
