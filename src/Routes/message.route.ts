import MessageController from "@/controllers/message.controller";
import AuthMiddleware from "@/middlewares/auth.middleware";
import ValidationMiddleware from "@/middlewares/validation.middleware";
import { messageValidation } from "@/validations/message.validation";
import { Router } from "express"

class MessageRoute {
    public path = '/message'
    public router = Router();
    public messageController = new MessageController()
    public authMiddleware = new AuthMiddleware()
    public validationMiddleware = new ValidationMiddleware()
    constructor() {
        this.initializeRoutes()
    }

    private initializeRoutes() {
        this.router.get(`${this.path}/:receiverId`, this.authMiddleware.authenticate, this.validationMiddleware.params(messageValidation.getMessages.params), this.messageController.getMessages)
    }
}

export default MessageRoute