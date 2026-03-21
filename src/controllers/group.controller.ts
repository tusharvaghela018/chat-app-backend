// controllers/group.controller.ts
import { Request, Response } from "express"
import asyncHandler, { sendResponse } from "@/utils"
import AppError from "@/utils/appError"
import User from "@/models/user.model"
import GroupRepository from "@/repositories/group.repository"
import GroupMemberRepository from "@/repositories/group-member.repository"
import GroupMessageRepository from "@/repositories/group-message.repository"
import GroupJoinRequestRepository from "@/repositories/group-join-request.repository"
import GroupSetting from "@/models/group-setting.model"

class GroupController {
    private groupRepo = new GroupRepository()
    private memberRepo = new GroupMemberRepository()
    private messageRepo = new GroupMessageRepository()
    private joinRequestRepo = new GroupJoinRequestRepository()

    // ─── POST /groups ─────────────────────────────────────────────────────────
    createGroup = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req.user as User).id

        const group = await this.groupRepo.createWithSettings(userId, req.body)

        return sendResponse({
            res,
            statusCode: 201,
            message: "Group created successfully",
            data: { group },
            show_toast: true,
        })
    })

    // ─── GET /groups ──────────────────────────────────────────────────────────
    getMyGroups = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req.user as User).id

        const groups = await this.groupRepo.findAllByUserId(userId)

        return sendResponse({
            res,
            message: "Groups fetched successfully",
            data: { groups },
        })
    })

    // ─── GET /groups/:id ──────────────────────────────────────────────────────
    getGroupById = asyncHandler(async (req: Request, res: Response) => {
        const groupId = Number(req.params.id)

        const group = await this.groupRepo.findByIdWithDetails(groupId)

        return sendResponse({
            res,
            message: "Group fetched successfully",
            data: { group },
        })
    })

    // ─── PATCH /groups/:id ────────────────────────────────────────────────────
    updateGroup = asyncHandler(async (req: Request, res: Response) => {
        const groupId = Number(req.params.id)

        await this.groupRepo.updateGroup(groupId, req.body)

        const updated = await this.groupRepo.findByIdWithDetails(groupId)

        return sendResponse({
            res,
            message: "Group updated successfully",
            data: { group: updated },
            show_toast: true,
        })
    })

    // ─── DELETE /groups/:id ───────────────────────────────────────────────────
    deleteGroup = asyncHandler(async (req: Request, res: Response) => {
        const groupId = Number(req.params.id)

        await this.groupRepo.deleteGroup(groupId)

        return sendResponse({
            res,
            message: "Group deleted successfully",
            show_toast: true,
        })
    })

    // ─── POST /groups/:id/members ─────────────────────────────────────────────
    addMember = asyncHandler(async (req: Request, res: Response) => {
        const groupId = Number(req.params.id)
        const adminId = (req.user as User).id

        const member = await this.memberRepo.addMember(groupId, adminId, req.body)

        // system message: "Alice was added by Admin"
        const addedUser = await User.findByPk(req.body.user_id, {
            attributes: ["name"],
        })
        const admin = await User.findByPk(adminId, { attributes: ["name"] })
        await this.messageRepo.createSystemMessage(
            groupId,
            `${addedUser?.name} was added by ${admin?.name}`
        )

        return sendResponse({
            res,
            statusCode: 201,
            message: "Member added successfully",
            data: { member },
            show_toast: true,
        })
    })

    // ─── DELETE /groups/:id/members/:userId ───────────────────────────────────
    removeMember = asyncHandler(async (req: Request, res: Response) => {
        const groupId = Number(req.params.id)
        const targetUserId = Number(req.params.userId)
        const adminId = (req.user as User).id

        // admin cannot remove themselves via this route — use leaveGroup
        if (targetUserId === adminId) {
            throw new AppError("Use the leave group endpoint to remove yourself", 400)
        }

        const targetUser = await User.findByPk(targetUserId, { attributes: ["name"] })
        const admin = await User.findByPk(adminId, { attributes: ["name"] })

        await this.memberRepo.removeMember(groupId, targetUserId)

        // system message: "Bob was removed by Admin"
        await this.messageRepo.createSystemMessage(
            groupId,
            `${targetUser?.name} was removed by ${admin?.name}`
        )

        return sendResponse({
            res,
            message: "Member removed successfully",
            show_toast: true,
        })
    })

    // ─── PATCH /groups/:id/members/:userId ────────────────────────────────────
    updateMemberRole = asyncHandler(async (req: Request, res: Response) => {
        const groupId = Number(req.params.id)
        const targetUserId = Number(req.params.userId)
        const adminId = (req.user as User).id

        await this.memberRepo.updateRole(groupId, targetUserId, req.body)

        const targetUser = await User.findByPk(targetUserId, { attributes: ["name"] })

        // system message based on role direction
        const action = req.body.role === "admin"
            ? `${targetUser?.name} is now an admin`
            : `${targetUser?.name} is no longer an admin`

        await this.messageRepo.createSystemMessage(groupId, action)

        return sendResponse({
            res,
            message: "Member role updated successfully",
            show_toast: true,
        })
    })

    // ─── DELETE /groups/:id/leave ─────────────────────────────────────────────
    leaveGroup = asyncHandler(async (req: Request, res: Response) => {
        const groupId = Number(req.params.id)
        const userId = (req.user as User).id

        // if last admin → block leaving, must promote someone first
        const isAdmin = await this.memberRepo.isAdmin(groupId, userId)
        if (isAdmin) {
            const adminCount = await this.memberRepo.count({
                where: { group_id: groupId, role: "admin" },
            })
            if (adminCount <= 1) {
                throw new AppError(
                    "You are the only admin. Promote another member before leaving.",
                    400
                )
            }
        }

        const user = await User.findByPk(userId, { attributes: ["name"] })
        await this.memberRepo.removeMember(groupId, userId)

        await this.messageRepo.createSystemMessage(
            groupId,
            `${user?.name} left the group`
        )

        return sendResponse({
            res,
            message: "You left the group",
            show_toast: true,
        })
    })

    // ─── GET /groups/:id/messages ─────────────────────────────────────────────
    getMessages = asyncHandler(async (req: Request, res: Response) => {
        const groupId = Number(req.params.id)
        const userId = (req.user as User).id
        const before = req.query.before ? Number(req.query.before) : undefined
        const limit = req.query.limit ? Number(req.query.limit) : 50

        const messages = await this.messageRepo.getMessages(groupId, limit, before)

        // update last_read_at when user loads messages
        await this.memberRepo.updateLastReadAt(groupId, userId)

        return sendResponse({
            res,
            message: "Messages fetched successfully",
            data: {
                messages,
                // tells frontend if there are more messages to load
                hasMore: messages.length === limit,
            },
        })
    })

    // ─── PATCH /groups/:id/settings ───────────────────────────────────────────
    updateSettings = asyncHandler(async (req: Request, res: Response) => {
        const groupId = Number(req.params.id)

        await GroupSetting.update(req.body, { where: { group_id: groupId } })

        const updated = await GroupSetting.findOne({ where: { group_id: groupId } })

        return sendResponse({
            res,
            message: "Settings updated successfully",
            data: { settings: updated },
            show_toast: true,
        })
    })

    // ─── POST /groups/:id/invite ──────────────────────────────────────────────
    generateInviteLink = asyncHandler(async (req: Request, res: Response) => {
        const groupId = Number(req.params.id)
        const { expires_in_hours } = req.body  // optional

        const token = await this.groupRepo.generateInviteToken(groupId, expires_in_hours)

        return sendResponse({
            res,
            message: "Invite link generated",
            data: {
                invite_link: `${process.env.FRONTEND_URL}/groups/join/${token}`,
                token,
            },
            show_toast: true,
        })
    })

    // ─── GET /groups/join/:token ──────────────────────────────────────────────
    joinViaLink = asyncHandler(async (req: Request, res: Response) => {
        const { token } = req.params
        const userId = (req.user as User).id

        const group = await this.groupRepo.findByInviteToken(token as string)

        // check if already a member
        const alreadyMember = await this.memberRepo.isMember(group.id, userId)
        if (alreadyMember) {
            throw new AppError("You are already a member of this group", 409)
        }

        // open mode → join instantly
        if (group.join_mode === "open") {
            const user = await User.findByPk(userId, { attributes: ["name"] })

            await this.memberRepo.addMember(group.id, null, { user_id: userId })

            await this.messageRepo.createSystemMessage(
                group.id,
                `${user?.name} joined via invite link`
            )

            return sendResponse({
                res,
                message: "You joined the group successfully",
                data: { group },
                show_toast: true,
            })
        }

        // approval mode → create join request
        const request = await this.joinRequestRepo.createRequest(group.id, userId)

        return sendResponse({
            res,
            statusCode: 202,  // 202 Accepted = pending, not yet done
            message: "Join request sent. Waiting for admin approval.",
            data: { request },
            show_toast: true,
        })
    })

    // ─── GET /groups/:id/join-requests ───────────────────────────────────────
    getPendingRequests = asyncHandler(async (req: Request, res: Response) => {
        const groupId = Number(req.params.id)

        const requests = await this.joinRequestRepo.findPending(groupId)

        return sendResponse({
            res,
            message: "Pending requests fetched",
            data: { requests },
        })
    })

    // ─── PATCH /groups/:id/join-requests/:requestId ───────────────────────────
    reviewJoinRequest = asyncHandler(async (req: Request, res: Response) => {
        const requestId = Number(req.params.requestId)
        const adminId = (req.user as User).id
        const { status } = req.body   // approved | rejected

        const request = await this.joinRequestRepo.review(requestId, adminId, status)

        // system message only on approval
        if (status === "approved") {
            const user = await User.findByPk(request.user_id, { attributes: ["name"] })
            await this.messageRepo.createSystemMessage(
                request.group_id,
                `${user?.name} joined the group`
            )
        }

        return sendResponse({
            res,
            message: status === "approved"
                ? "Request approved. User added to group."
                : "Request rejected.",
            data: { request },
            show_toast: true,
        })
    })
}

export default GroupController