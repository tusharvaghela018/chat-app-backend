import { Router } from "express";
import { Routes } from "@/types/general/route.interface";
import IndexController from "@/controllers/index.controller";
import AuthMiddleware from "@/middlewares/auth.middleware";

class IndexRoute implements Routes {
    public path = "/";
    public router = Router();
    public indexController = new IndexController();
    public authMiddleware = new AuthMiddleware();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // Public route: accessible to both logged-in and guest users
        this.router.get(`${this.path}home`, this.authMiddleware.softAuthenticate, this.indexController.home);

        // Protected route: accessible ONLY to logged-in users
        this.router.get(`${this.path}dashboard`, this.authMiddleware.authenticate, this.indexController.dashboard);
    }
}

export default IndexRoute;
