import User from "@/models/user.model";
import UserRepository from "@/repositories/user.repository";
import asyncHandler, { sendResponse } from "@/utils";
import { Request, Response } from "express";
import { Op } from "sequelize";

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

    readonly updatePublicKey = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req.user as User).id
        const { public_key, encrypted_vault, vault_salt } = req.body

        await this.userRepo.update({ 
            public_key,
            encrypted_vault,
            vault_salt
        }, {
            where: {
                id: userId
            }
        })

        return sendResponse({ res, message: "Security Data Updated successfully", success: true })
    })

    readonly updateProfile = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req.user as any).id
        const { name, username } = req.body
        const avatar = (req.file as any)?.path

        const updateData: any = {}
        if (name) updateData.name = name
        if (avatar) updateData.avatar = avatar

        if (username) {
            const existingUser = await this.userRepo.findOne({
                where: {
                    username,
                    id: { [Op.ne]: userId }
                }
            })
            if (existingUser) {
                return sendResponse({ res, message: "Username is already taken", success: false, show_toast: true })
            }
            updateData.username = username
        }

        await this.userRepo.update(updateData, {
            where: {
                id: userId
            }
        })

        return sendResponse({ res, message: "Profile Updated successfully", success: true, show_toast: true })
    })
}

export default UserController