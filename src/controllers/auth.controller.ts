import { FRONTEND_URL } from "@/config";
import User from "@/models/user.model";
import UserRepository from "@/repositories/user.repository";
import { sendResponse } from "@/utils";
import jwtUtil from "@/utils/jwt.util";
import type { Request, Response } from "express";

class AuthController {
    private userRepo: UserRepository

    constructor() {
        this.userRepo = new UserRepository()
    }

    public login = async (req: Request, res: Response) => {
        try {
            const { user, token } = await this.userRepo.login(req.body)
            return sendResponse({ res, message: "Logeed in successfully", data: { user, token } })
        } catch (error) {
            return sendResponse({ res, success: false, statusCode: 500, message: error.message, error: error?.message })
        }
    };

    public register = async (req: Request, res: Response) => {
        try {
            const { user, token } = await this.userRepo.register(req.body)
            return sendResponse({ res, data: { user, token }, message: "Signup successfully", })
        } catch (error) {
            return sendResponse({ res, statusCode: 500, message: "Internal server error", error: error?.message })
        }
    }

    public googleCallback = (req: Request, res: Response): void => {
        try {
            const user = req.user as User;
            const token = jwtUtil.sign({ id: user.id, email: user.email });
            // Redirect to frontend with token (or return JSON for mobile)
            res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
        } catch (error) {
            sendResponse({ res, statusCode: 500, message: error.message, error: error.message })
        }
    };

    public getMe = async (req: Request, res: Response) => {
        try {
            const user = await this.userRepo.findOne({
                where: {
                    id: (req.user as User).id
                }
            })

            if (!user) {
                return sendResponse({ res, statusCode: 404, message: "User Not Found" })
            }
            delete user.password

            return sendResponse({ res, data: { user } })
        } catch (error) {
            sendResponse({ res, statusCode: 500, message: error.message, error: error.message })
        }
    }
}

export default AuthController;
