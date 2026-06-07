import { Router } from "express";
import passport from "passport";

import AuthController from "@/controllers/auth.controller";
import { Routes } from "@/types/general/route.interface";
import AuthMiddleware from "@/middlewares/auth.middleware";
import ValidationMiddleware from "@/middlewares/validation.middleware";
import { authValidation } from "@/validations/auth.validation";

class AuthRoute implements Routes {
    public path = "/auth";
    public router = Router();
    public validationMiddleware = new ValidationMiddleware()
    public authController = new AuthController();
    public authMiddleware = new AuthMiddleware();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get(`${this.path}/mail-status`, this.authController.getMailStatus);
        this.router.post(`${this.path}/login`, this.validationMiddleware.body(authValidation.login), this.authController.login);
        this.router.post(`${this.path}/register`, this.validationMiddleware.body(authValidation.register), this.authController.register)
        this.router.post(`${this.path}/forgot-password`, this.validationMiddleware.body(authValidation.forgotPassword), this.authController.forgotPassword);
        this.router.post(`${this.path}/reset-password`, this.validationMiddleware.body(authValidation.resetPassword), this.authController.resetPassword);

        // ─── Google OAuth ─────────────────────────────────────────────────────
        this.router.get(`${this.path}/google`, passport.authenticate("google", {
            scope: ["profile", "email"],
            session: false,
        }))
        this.router.get(`${this.path}/google/callback`, this.authMiddleware.passportMiddleware, this.authController.googleCallback)

        this.router.get(`${this.path}/me`, this.authMiddleware.authenticate, this.authController.getMe)

        // ─── Two-Factor Authentication (2FA) ──────────────────────────────────
        this.router.post(`${this.path}/2fa/setup`, this.authMiddleware.authenticate, this.authController.setup2FA);
        this.router.post(`${this.path}/2fa/verify`, this.authMiddleware.authenticate, this.validationMiddleware.body(authValidation.verify2FA), this.authController.verifyAndEnable2FA);
        this.router.post(`${this.path}/2fa/disable`, this.authMiddleware.authenticate, this.validationMiddleware.body(authValidation.verify2FA), this.authController.disable2FA);
        this.router.post(`${this.path}/2fa/login`, this.validationMiddleware.body(authValidation.verifyLogin2FA), this.authController.verifyLogin2FA);
    }
}

export default AuthRoute;
