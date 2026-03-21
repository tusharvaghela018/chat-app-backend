import UserController from "@/controllers/user.controller"
import AuthMiddleware from "@/middlewares/auth.middleware";
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
    }
}

export default UserRoute