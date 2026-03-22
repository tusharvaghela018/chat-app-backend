// middlewares/group.middleware.ts
import { Request, Response, NextFunction } from "express"
import GroupMemberRepository from "@/repositories/group-member.repository"
import GroupSetting from "@/models/group-setting.model"
import User from "@/models/user.model"
import AppError from "@/utils/appError"

class GroupMiddleware {
    private memberRepo = new GroupMemberRepository()

    // ─── Must be a member of the group ───────────────────────────────────────
    readonly requireMember = async (req: Request, _: Response, next: NextFunction) => {
        try {
            const groupId = Number(req.params.id)
            const userId = (req.user as User).id

            const member = await this.memberRepo.isMember(groupId, userId)
            if (!member) throw new AppError("You are not a member of this group", 403)

            // attach to req so controller can use it without re-querying
            req.groupMember = member
            next()
        } catch (error) {
            next(error)
        }
    }

    // ─── Must be an admin of the group ───────────────────────────────────────
    readonly requireAdmin = async (req: Request, _: Response, next: NextFunction) => {
        try {
            const groupId = Number(req.params.id)
            const userId = (req.user as User).id

            const isAdmin = await this.memberRepo.isAdmin(groupId, userId)
            if (!isAdmin) throw new AppError("Only group admins can perform this action", 403)

            next()
        } catch (error) {
            next(error)
        }
    }

    // ─── Check a specific group setting against member role ──────────────────
    // usage: checkSetting("who_can_send")
    readonly checkSetting = (settingKey: keyof GroupSetting) => {
        return async (req: Request, _: Response, next: NextFunction) => {
            try {
                const groupId = Number(req.params.id)
                const userId = (req.user as User).id

                const member = await this.memberRepo.isMember(groupId, userId)
                if (!member) throw new AppError("You are not a member of this group", 403)

                const setting = await GroupSetting.findOne({
                    where: { group_id: groupId }
                })
                if (!setting) throw new AppError("Group settings not found", 404)

                const requiredRole = setting[settingKey] as string

                // if setting is "admins", only admins can proceed
                if (requiredRole === "admins" && member.role !== "admin") {
                    throw new AppError("You don't have permission to perform this action", 403)
                }

                next()
            } catch (error) {
                next(error)
            }
        }
    }
}

export default GroupMiddleware