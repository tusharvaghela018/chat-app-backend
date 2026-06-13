import User from "@/models/user.model";
import MessageRepository from "@/repositories/message.repository";
import asyncHandler, { sendResponse } from "@/utils";
import { Request, Response } from "express";

class MessageController {

    private messageRepo: MessageRepository

    constructor() {
        this.messageRepo = new MessageRepository()
    }

    readonly getMessages = asyncHandler(async (req: Request, res: Response) => {
        const senderId = (req.user as User).id
        const receiverId = Number(req.params.receiverId)
        const before = req.query.before ? Number(req.query.before) : undefined
        const limit = req.query.limit ? Number(req.query.limit) : 50

        const messages = await this.messageRepo.getMessages(senderId, receiverId, limit, before)

        return sendResponse({
            res,
            data: {
                messages,
                hasMore: messages.length === limit
            }
        })
    })
}

export default MessageController;