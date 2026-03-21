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
        const messages = await this.messageRepo.getAllMessages(senderId, receiverId)
        return sendResponse({ res, data: messages })
    })
}

export default MessageController;