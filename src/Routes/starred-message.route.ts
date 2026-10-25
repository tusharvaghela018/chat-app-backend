import { Router } from "express";
import StarredMessageController from "@/controllers/starred-message.controller";
import AuthMiddleware from "@/middlewares/auth.middleware";
import { Routes } from "@/types/general/route.interface";

class StarredMessageRoute implements Routes {
    public path = "/starred-messages";
    public router = Router();
    public starredMessageController = new StarredMessageController();
    public authMiddleware = new AuthMiddleware();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(this.path, this.authMiddleware.authenticate);

        this.router.post(`${this.path}/toggle`, this.starredMessageController.toggleStar);
        this.router.get(this.path, this.starredMessageController.getStarredMessages);
        this.router.get(`${this.path}/ids`, this.starredMessageController.getStarredIds);
    }
}

export default StarredMessageRoute;
