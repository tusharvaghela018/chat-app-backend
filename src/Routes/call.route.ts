import { Router } from "express";
import { Routes } from "@/types/general/route.interface";
import callController from "@/controllers/call.controller";
import AuthMiddleware from "@/middlewares/auth.middleware";

class CallRoute implements Routes {
    public path = "/calls";
    public router = Router();
    public authMiddleware = new AuthMiddleware();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get(
            `${this.path}`,
            this.authMiddleware.authenticate,
            callController.getCallHistory
        );
    }
}

export default CallRoute;
