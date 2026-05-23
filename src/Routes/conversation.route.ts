import { Router } from "express";
import ConversationController from "@/controllers/conversation.controller";
import AuthMiddleware from "@/middlewares/auth.middleware";
import { Routes } from "@/types/general/route.interface";

class ConversationRoute implements Routes {
    public path = "/conversations";
    public router = Router();
    public conversationController = new ConversationController();
    public authMiddleware = new AuthMiddleware();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(this.path, this.authMiddleware.authenticate);

        this.router.get(this.path, this.conversationController.getMyConversations);
        this.router.get(`${this.path}/blocked`, this.conversationController.getBlockedConversations);
        this.router.get(`${this.path}/user/:receiverId`, this.conversationController.getConversationByUser);
        this.router.patch(`${this.path}/:id/status`, this.conversationController.updateStatus);
        this.router.patch(`${this.path}/:id/block`, this.conversationController.updateBlockStatus);
    }
}

export default ConversationRoute;
