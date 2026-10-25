import User from "@/models/user.model";
import UserRepository from "@/repositories/user.repository";
import asyncHandler, { sendResponse } from "@/utils";
import { Request, Response } from "express";
import { Op } from "sequelize";
import SocketServer from "@/config/Socket";

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

    readonly updateSettings = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req.user as any).id
        const { 
            last_seen_privacy, 
            avatar_privacy, 
            read_receipts, 
            search_discoverable, 
            find_by_email_phone 
        } = req.body

        const updateData: any = {}
        const validOptions = ["everyone", "contacts", "nobody"]

        if (last_seen_privacy && validOptions.includes(last_seen_privacy)) {
            updateData.last_seen_privacy = last_seen_privacy
        }
        if (avatar_privacy && validOptions.includes(avatar_privacy)) {
            updateData.avatar_privacy = avatar_privacy
        }
        if (typeof read_receipts === "boolean") {
            updateData.read_receipts = read_receipts
        }
        if (typeof search_discoverable === "boolean") {
            updateData.search_discoverable = search_discoverable
        }
        if (typeof find_by_email_phone === "boolean") {
            updateData.find_by_email_phone = find_by_email_phone
        }

        if (Object.keys(updateData).length > 0) {
            await this.userRepo.update(updateData, {
                where: { id: userId }
            })
            // Real-time synchronization with active socket connections
            SocketServer.getInstance().updateUserPrivacy(userId, {
                last_seen_privacy: updateData.last_seen_privacy,
                read_receipts: updateData.read_receipts,
                avatar_privacy: updateData.avatar_privacy
            })
        }

        const updatedUser = await this.userRepo.findOne({
            where: { id: userId }
        })

        return sendResponse({
            res,
            message: "Settings updated successfully",
            data: { user: (this.userRepo as any).sanitize(updatedUser!) },
            success: true,
            show_toast: true
        })
    })
}

export default UserController