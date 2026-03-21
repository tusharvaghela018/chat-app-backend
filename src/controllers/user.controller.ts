import User from "@/models/user.model";
import UserRepository from "@/repositories/user.repository";
import asyncHandler, { sendResponse } from "@/utils";
import { Request, Response } from "express";

class UserController {
    private userRepo: UserRepository
    constructor() {
        this.userRepo = new UserRepository()
    }

    readonly getUserList = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req.user as User).id
        const users = await this.userRepo.getUserList(userId)
        return sendResponse({ res, data: users, success: true })
    })
}

export default UserController