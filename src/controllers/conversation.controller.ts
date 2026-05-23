import ConversationRepository from "@/repositories/conversation.repository";
import asyncHandler, { sendResponse } from "@/utils";
import { Request, Response } from "express";
import User from "@/models/user.model";

class ConversationController {
    private conversationRepo: ConversationRepository;

    constructor() {
        this.conversationRepo = new ConversationRepository();
    }

    readonly getMyConversations = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req.user as User).id;
        const conversations = await this.conversationRepo.getMyConversations(userId);

        // Sanitize to hide 'they blocked me' info
        const sanitized = conversations.map(c => {
            const isSender = c.sender_id === userId
            return {
                ...c,
                blocked_by_sender: isSender ? c.blocked_by_sender : false,
                blocked_by_receiver: !isSender ? c.blocked_by_receiver : false
            }
        })

        return sendResponse({ res, data: sanitized });
    });

    readonly getConversationByUser = asyncHandler(async (req: Request, res: Response) => {
        const senderId = (req.user as User).id;
        const receiverId = Number(req.params.receiverId);
        const conversation = await this.conversationRepo.getConversation({ senderId, receiverId });
        
        if (!conversation) return sendResponse({ res, data: null });

        // Sanitize to hide 'they blocked me' info
        const plain = conversation.toJSON() as any
        const isSender = plain.sender_id === senderId
        
        const sanitized = {
            ...plain,
            blocked_by_sender: isSender ? plain.blocked_by_sender : false,
            blocked_by_receiver: !isSender ? plain.blocked_by_receiver : false
        }

        return sendResponse({ res, data: sanitized });
    });

    readonly getBlockedConversations = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req.user as User).id;
        const conversations = await this.conversationRepo.getBlockedConversations(userId);

        // Sanitize - they are all blocked by current user
        const sanitized = conversations.map(c => {
            const isSender = c.sender_id === userId
            const otherUser = isSender ? c.receiver : c.sender
            return {
                id: c.id,
                user: otherUser,
                blocked_at: c.updatedAt
            }
        })

        return sendResponse({ res, data: sanitized });
    });

    readonly updateStatus = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req.user as User).id;
        const { id } = req.params;
        const { status } = req.body;

        if (!['accepted', 'rejected'].includes(status)) {
            throw new Error("Invalid status. Must be 'accepted' or 'rejected'");
        }

        const conversation = await this.conversationRepo.updateStatus(Number(id), userId, status);
        return sendResponse({ 
            res, 
            message: `Conversation request ${status} successfully`, 
            data: conversation 
        });
    });

    readonly updateBlockStatus = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req.user as User).id;
        const { id } = req.params;
        const { block } = req.body; // true to block, false to unblock

        const conversation = await this.conversationRepo.updateBlockStatus(Number(id), userId, !!block);
        return sendResponse({ 
            res, 
            message: `User ${block ? 'blocked' : 'unblocked'} successfully`, 
            data: conversation 
        });
    });
}

export default ConversationController;
