import UserController from "@/controllers/user.controller"
import AuthMiddleware from "@/middlewares/auth.middleware";
import uploadMiddleware from "@/middlewares/upload.middleware";
import { Router } from "express";

class UserRoute {
    public path = "/users"
    public router = Router();
    public userController = new UserController();
    public authMiddleware = new AuthMiddleware();

    constructor() {
        this.initializeRoutes()
    }

    private initializeRoutes() {
        this.router.get(`${this.path}`, this.authMiddleware.authenticate, this.userController.getUserList)
        this.router.patch(`${this.path}`, this.authMiddleware.authenticate, uploadMiddleware.userAvatar, this.userController.updateUserAvatar)
    }
}

export default UserRoute