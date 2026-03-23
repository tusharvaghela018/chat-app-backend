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
import { JOIN_MODES } from "@/constants/socket.constants"
import SocketServer from "@/config/Socket"

class GroupController {
    private groupRepo = new GroupRepository()
    private memberRepo = new GroupMemberRepository()
    private messageRepo = new GroupMessageRepository()
    private joinRequestRepo = new GroupJoinRequestRepository()

    // ─── POST /groups ─────────────────────────────────────────────────────────
    readonly createGroup = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req.user as User).id

        const avatar = (req.file as any)?.path ?? null

        const group = await this.groupRepo.createWithSettings(userId, {
            ...req.body,
            ...(avatar && { avatar }),  // ← add avatar if present
        })

        return sendResponse({
            res,
            statusCode: 201,
            message: "Group created successfully",
            data: { group },
            show_toast: true,
        })
    })

    // ─── GET /groups ──────────────────────────────────────────────────────────
    readonly getMyGroups = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req.user as User).id
        const search = req.query.search as string | undefined
        const page = req.query.page ? Number(req.query.page) : 1
        const limit = req.query.limit ? Number(req.query.limit) : 20

        const data = await this.groupRepo.findAllByUserId({
            userId,
            search,
            page,
            limit,
        })

        return sendResponse({
            res,
            message: "Groups fetched successfully",
            data,
        })
    })

    // ─── GET /groups/:id ──────────────────────────────────────────────────────
    readonly getGroupById = asyncHandler(async (req: Request, res: Response) => {
        const groupId = Number(req.params.id)

        const group = await this.groupRepo.findByIdWithDetails(groupId)

        return sendResponse({
            res,
            message: "Group fetched successfully",
            data: { group },
        })
    })

    // ─── PATCH /groups/:id ────────────────────────────────────────────────────
    readonly updateGroup = asyncHandler(async (req: Request, res: Response) => {
        const groupId = Number(req.params.id)

        // get avatar url if file uploaded
        const avatar = (req.file as any)?.path ?? null

        await this.groupRepo.updateGroup(groupId, {
            ...req.body,
            ...(avatar && { avatar }),  // ← add avatar if present
        })

        const updated = await this.groupRepo.findByIdWithDetails(groupId)

        return sendResponse({
            res,
            message: "Group updated successfully",
            data: { group: updated },
            show_toast: true,
        })
    })

    // ─── DELETE /groups/:id ───────────────────────────────────────────────────
    readonly deleteGroup = asyncHandler(async (req: Request, res: Response) => {
        const groupId = Number(req.params.id)

        await this.groupRepo.deleteGroup(groupId)

        return sendResponse({
            res,
            message: "Group deleted successfully",
            show_toast: true,
        })
    })

    // ─── POST /groups/:id/members ─────────────────────────────────────────────
    readonly addMember = asyncHandler(async (req: Request, res: Response) => {
        const groupId = Number(req.params.id)
        const adminId = (req.user as User).id

        const member = await this.memberRepo.addMember(groupId, adminId, req.body)

        // system message: "Alice was added by Admin"
        const addedUser = await User.findByPk(req.body.user_id, {
            attributes: ["name"],
        })
        const admin = await User.findByPk(adminId, { attributes: ["name"] })

        await this.createAndEmitSystemMessage(groupId,
            `${addedUser?.name} was added by ${admin?.name}`)

        SocketServer.getInstance().notifyMemberAdded(req.body.user_id, groupId)

        return sendResponse({
            res,
            statusCode: 201,
            message: "Member added successfully",
            data: { member },
            show_toast: true,
        })
    })

    // ─── DELETE /groups/:id/members/:userId ───────────────────────────────────
    readonly removeMember = asyncHandler(async (req: Request, res: Response) => {
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
        await this.createAndEmitSystemMessage(
            groupId,
            `${targetUser?.name} was removed by ${admin?.name}`
        )

        // ← notify removed user's socket to leave the group room
        SocketServer.getInstance().notifyMemberLeft(groupId, targetUserId)


        return sendResponse({
            res,
            message: "Member removed successfully",
            show_toast: true,
        })
    })

    // ─── PATCH /groups/:id/members/:userId ────────────────────────────────────
    readonly updateMemberRole = asyncHandler(async (req: Request, res: Response) => {
        const groupId = Number(req.params.id)
        const targetUserId = Number(req.params.userId)
        // const adminId = (req.user as User).id

        await this.memberRepo.updateRole(groupId, targetUserId, req.body)

        const targetUser = await User.findByPk(targetUserId, { attributes: ["name"] })

        // system message based on role direction
        const action = req.body.role === "admin"
            ? `${targetUser?.name} is now an admin`
            : `${targetUser?.name} is no longer an admin`

        await this.createAndEmitSystemMessage(groupId, action)

        return sendResponse({
            res,
            message: "Member role updated successfully",
            show_toast: true,
        })
    })

    // ─── DELETE /groups/:id/leave ─────────────────────────────────────────────
    readonly leaveGroup = asyncHandler(async (req: Request, res: Response) => {
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

        await this.createAndEmitSystemMessage(
            groupId,
            `${user?.name} left the group`
        )

        SocketServer.getInstance().notifyMemberLeft(groupId, userId)

        return sendResponse({
            res,
            message: "You left the group",
            show_toast: true,
        })
    })

    // ─── GET /groups/:id/messages ─────────────────────────────────────────────
    readonly getMessages = asyncHandler(async (req: Request, res: Response) => {
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
    readonly updateSettings = asyncHandler(async (req: Request, res: Response) => {
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
    readonly generateInviteLink = asyncHandler(async (req: Request, res: Response) => {
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
    readonly joinViaLink = asyncHandler(async (req: Request, res: Response) => {
        const { token } = req.params
        const userId = (req.user as User).id

        const group = await this.groupRepo.findByInviteToken(token as string)

        // check if already a member
        const alreadyMember = await this.memberRepo.isMember(group.id, userId)
        if (alreadyMember) {
            // throw new AppError("You are already a member of this group", 400)
            return sendResponse(
                {
                    res,
                    data: {
                        group_id: group.id
                    },
                    message: ""
                }
            )
        }

        // open mode → join instantly
        if (group.join_mode === JOIN_MODES.OPEN) {
            const user = await User.findByPk(userId, { attributes: ["name"] })

            await this.memberRepo.addMember(group.id, null, { user_id: userId })

            await this.createAndEmitSystemMessage(
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
            statusCode: 201,  // 202 Accepted = pending, not yet done
            message: "Join request sent. Waiting for admin approval.",
            data: { request },
            show_toast: true,
        })
    })

    // ─── GET /groups/:id/join-requests ───────────────────────────────────────
    readonly getPendingRequests = asyncHandler(async (req: Request, res: Response) => {
        const groupId = Number(req.params.id)

        const requests = await this.joinRequestRepo.findPending(groupId)

        return sendResponse({
            res,
            message: "Pending requests fetched",
            data: { requests },
        })
    })

    // ─── PATCH /groups/:id/join-requests/:requestId ───────────────────────────
    readonly reviewJoinRequest = asyncHandler(async (req: Request, res: Response) => {
        const requestId = Number(req.params.requestId)
        const adminId = (req.user as User).id
        const { status } = req.body   // approved | rejected

        const request = await this.joinRequestRepo.review(requestId, adminId, status)

        // system message only on approval
        if (status === "approved") {
            const user = await User.findByPk(request.user_id, { attributes: ["name"] })

            await this.createAndEmitSystemMessage(
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

    // add this private helper
    private async createAndEmitSystemMessage(groupId: number, content: string) {
        const message = await this.messageRepo.createSystemMessage(groupId, content)
        const { id, group_id, sender_id, type, created_at } = message.toJSON()

        SocketServer.getInstance().notifyGroupMessage(groupId, {
            id,
            group_id,
            sender_id,
            content,
            type,
            created_at,
        })
    }
}

export default GroupController