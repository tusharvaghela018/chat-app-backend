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
        const search = req.query.search as string | undefined
        const page = req.query.page ? Number(req.query.page) : 1
        const limit = req.query.limit ? Number(req.query.limit) : 20

        const data = await this.userRepo.getUserList({
            userId,
            search,
            page,
            limit,
        })

        return sendResponse({ res, data, success: true })
    })

    readonly updateUserAvatar = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req.user as any).id
        const avatar = (req.file as any)?.path ?? null
        await this.userRepo.update({ avatar }, {
            where: {
                id: userId
            }
        })

        return sendResponse({ res, message: "Profile Updated successfully", show_toast: true })
    })
}

export default UserController