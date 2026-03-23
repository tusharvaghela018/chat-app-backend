// routes/group.route.ts
import { Router } from "express"
import { Routes } from "@/types/general/route.interface"
import AuthMiddleware from "@/middlewares/auth.middleware"
import GroupMiddleware from "@/middlewares/group.middleware"
import ValidationMiddleware from "@/middlewares/validation.middleware"
import GroupController from "@/controllers/group.controller"
import { groupValidation } from "@/validations/group.validation"
import uploadMiddleware from "@/middlewares/upload.middleware"

class GroupRoute implements Routes {
    public path = "/groups"
    public router = Router()

    private authMiddleware = new AuthMiddleware()
    private groupMiddleware = new GroupMiddleware()
    private validationMiddleware = new ValidationMiddleware()
    private groupController = new GroupController()

    constructor() {
        this.initializeRoutes()
    }

    private initializeRoutes() {
        // ── all group routes require authentication ──────────────────────────
        this.router.use(this.path, this.authMiddleware.authenticate)

        // ── join via invite link (no group membership needed) ────────────────
        // NOTE: this must be BEFORE /:id routes to avoid conflict
        this.router.post(
            `${this.path}/join/:token`,
            this.groupController.joinViaLink
        )

        // ── group CRUD ───────────────────────────────────────────────────────
        this.router.post(
            `${this.path}`,
            uploadMiddleware.groupAvatar,
            this.validationMiddleware.body(groupValidation.createGroup),
            this.groupController.createGroup
        )

        this.router.get(
            `${this.path}`,
            this.groupController.getMyGroups
        )

        this.router.get(
            `${this.path}/:id`,
            this.groupMiddleware.requireMember,
            this.groupController.getGroupById
        )

        this.router.patch(
            `${this.path}/:id`,
            this.groupMiddleware.requireMember,
            this.groupMiddleware.checkSetting("who_can_edit_info"),
            uploadMiddleware.groupAvatar,
            this.validationMiddleware.body(groupValidation.updateGroup),
            this.groupController.updateGroup
        )

        this.router.delete(
            `${this.path}/:id`,
            this.groupMiddleware.requireMember,
            this.groupMiddleware.requireAdmin,
            this.groupController.deleteGroup
        )

        // ── leave group ──────────────────────────────────────────────────────
        this.router.delete(
            `${this.path}/:id/leave`,
            this.groupMiddleware.requireMember,
            this.groupController.leaveGroup
        )

        // ── members ──────────────────────────────────────────────────────────
        this.router.post(
            `${this.path}/:id/members`,
            this.groupMiddleware.requireMember,
            this.groupMiddleware.checkSetting("who_can_add_members"),
            this.validationMiddleware.body(groupValidation.addMember),
            this.groupController.addMember
        )

        this.router.delete(
            `${this.path}/:id/members/:userId`,
            this.groupMiddleware.requireMember,
            this.groupMiddleware.requireAdmin,
            this.groupController.removeMember
        )

        this.router.patch(
            `${this.path}/:id/members/:userId`,
            this.groupMiddleware.requireMember,
            this.groupMiddleware.requireAdmin,
            this.validationMiddleware.body(groupValidation.updateMemberRole),
            this.groupController.updateMemberRole
        )

        // ── messages ─────────────────────────────────────────────────────────
        this.router.get(
            `${this.path}/:id/messages`,
            this.groupMiddleware.requireMember,
            this.groupController.getMessages
        )

        // ── settings ─────────────────────────────────────────────────────────
        this.router.patch(
            `${this.path}/:id/settings`,
            this.groupMiddleware.requireMember,
            this.groupMiddleware.requireAdmin,
            this.validationMiddleware.body(groupValidation.updateSettings),
            this.groupController.updateSettings
        )

        // ── invite link ──────────────────────────────────────────────────────
        this.router.post(
            `${this.path}/:id/invite`,
            this.groupMiddleware.requireMember,
            this.groupMiddleware.checkSetting("who_can_share_link"),
            this.groupController.generateInviteLink
        )

        // ── join requests (approval mode) ────────────────────────────────────
        this.router.get(
            `${this.path}/:id/join-requests`,
            this.groupMiddleware.requireMember,
            this.groupMiddleware.requireAdmin,
            this.groupController.getPendingRequests
        )

        this.router.patch(
            `${this.path}/:id/join-requests/:requestId`,
            this.groupMiddleware.requireMember,
            this.groupMiddleware.requireAdmin,
            this.validationMiddleware.body(groupValidation.reviewJoinRequest),
            this.groupController.reviewJoinRequest
        )
    }
}

export default GroupRoute