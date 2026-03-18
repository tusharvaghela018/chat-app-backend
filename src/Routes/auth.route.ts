import AuthController from "@/controllers/auth.controller";
import { Routes } from "@/interfaces/general/route.interface";
import { Router } from "express";

class AuthRoute implements Routes {
    public path = "/auth";
    public router = Router();
    public authController = new AuthController();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get(`${this.path}/login`, this.authController.login);
    }
}

export default AuthRoute;
