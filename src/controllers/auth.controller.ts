import { FRONTEND_URL } from "@/config";
import User from "@/models/user.model";
import UserRepository from "@/repositories/user.repository";
import asyncHandler, { sendResponse } from "@/utils";
import AppError from "@/utils/appError";
import jwtUtil from "@/utils/jwt.util";
import type { Request, Response } from "express";

class AuthController {
    private userRepo: UserRepository

    constructor() {
        this.userRepo = new UserRepository()
    }

    public login = asyncHandler(async (req: Request, res: Response) => {
        const { user, token } = await this.userRepo.login(req.body)
        return sendResponse({ res, message: "Logeed in successfully", data: { user, token }, show_toast: true })
    });

    public register = asyncHandler(async (req: Request, res: Response) => {
        const { user, token } = await this.userRepo.register(req.body)
        return sendResponse({ res, data: { user, token }, message: "Signup successfully", show_toast: true })
    })

    public googleCallback = asyncHandler(async (req: Request, res: Response) => {
        const user = req.user as User;
        const token = jwtUtil.sign({ id: user.id, email: user.email });
        res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
    });

    public getMe = asyncHandler(async (req: Request, res: Response) => {
        const user = await this.userRepo.findOne({
            where: {
                id: (req.user as User).id
            }
        })

        if (!user) {
            throw new AppError('User Not Found', 404)
        }
        delete user.password

        return sendResponse({ res, data: { user } })
    });
}

export default AuthController;
