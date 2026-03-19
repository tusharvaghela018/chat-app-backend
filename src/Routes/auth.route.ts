import AuthController from "@/controllers/auth.controller";
import { Routes } from "@/types/general/route.interface";
import AuthMiddleware from "@/middlewares/auth.middleware";
import { Router } from "express";
import passport from "passport";

class AuthRoute implements Routes {
    public path = "/auth";
    public router = Router();
    public authController = new AuthController();
    public authMiddleware = new AuthMiddleware()

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post(`${this.path}/login`, this.authController.login);
        this.router.post(`${this.path}/register`, this.authController.register)
        // ─── Google OAuth ─────────────────────────────────────────────────────
        this.router.get(`${this.path}/google`, passport.authenticate("google", {
            scope: ["profile", "email"],
            session: false,
        }))
        this.router.get(`${this.path}/google/callback`, passport.authenticate("google", { session: false, failureRedirect: "/login" }), this.authController.googleCallback)

        this.router.get(`${this.path}/me`, this.authMiddleware.authenticate, this.authController.getMe)
    }
}

export default AuthRoute;
