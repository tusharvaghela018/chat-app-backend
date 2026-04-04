import BaseRepository from "@/repositories"
import GroupJoinRequest from "@/models/group-join-request.model"
import GroupMember from "@/models/group-member.model"
import User from "@/models/user.model"
import AppError from "@/utils/appError"
import db from "@/models"
import { Transaction } from "sequelize"

class GroupJoinRequestRepository extends BaseRepository<GroupJoinRequest> {
    constructor() {
        super(GroupJoinRequest)
    }

    // ─── Create a new join request ───────────────────────────────────────────
    readonly createRequest = async (
        groupId: number,
        userId: number
    ): Promise<GroupJoinRequest> => {
        // check for existing request (including soft-deleted or already reviewed)
        const existing = await this.findOne({
            where: { group_id: groupId, user_id: userId },
            paranoid: false
        })

        if (existing) {
            if (existing.status === "pending" && !(existing as any).deleted_at) {
                throw new AppError("You already have a pending request for this group", 400)
            }

            // if it was previously reviewed or soft-deleted, restore and reset it
            await existing.restore()
            await existing.update({
                status: "pending",
                requested_at: new Date(),
                reviewed_by: null,
                reviewed_at: null,
            })
            return existing
        }

        return await this.create({
            group_id: groupId,
            user_id: userId,
            status: "pending",
            requested_at: new Date(),
        } as any)
    }

    // ─── Get all pending requests for a group (admin view) ───────────────────
    readonly findPending = async (groupId: number): Promise<GroupJoinRequest[]> => {
        return await this.findAll({
            where: { group_id: groupId, status: "pending" },
            include: [
                {
                    model: User,
                    as: "requester",
                    attributes: ["id", "name", "avatar", "email"],
                },
            ],
            order: [["requested_at", "ASC"]], // oldest first
        })
    }

    // ─── Approve or reject a request ─────────────────────────────────────────
    readonly review = async (
        requestId: number,
        adminId: number,
        status: "approved" | "rejected"
    ): Promise<GroupJoinRequest> => {
        const request = await this.findById(requestId)
        if (!request) throw new AppError("Join request not found", 404)
        if (request.status !== "pending") throw new AppError("This request has already been reviewed", 400)

        const transaction: Transaction = await db.transaction()

        try {
            // update the request status
            await this.update(
                {
                    status,
                    reviewed_by: adminId,
                    reviewed_at: new Date(),
                },
                { where: { id: requestId }, transaction }
            )

            // if approved → add to group_members
            if (status === "approved") {
                // Check if they were previously a member (soft-deleted)
                const existingMember = await GroupMember.findOne({
                    where: { group_id: request.group_id, user_id: request.user_id },
                    paranoid: false,
                    transaction
                })

                if (existingMember) {
                    await existingMember.restore({ transaction })
                    await existingMember.update({
                        role: "member",
                        added_by: adminId,
                        joined_at: new Date()
                    }, { transaction })
                } else {
                    await GroupMember.create(
                        {
                            group_id: request.group_id,
                            user_id: request.user_id,
                            role: "member",
                            added_by: adminId,
                        },
                        { transaction }
                    )
                }
            }

            await transaction.commit()

            // return updated request
            return (await this.findById(requestId, {
                include: [{ model: User, as: "requester", attributes: ["id", "name", "avatar"] }]
            }))!

        } catch (error) {
            await transaction.rollback()
            throw error
        }
    }

    // ─── Check if a request already exists (any status) ─────────────────────
    readonly exists = async (
        groupId: number,
        userId: number
    ): Promise<boolean> => {
        const request = await this.findOne({
            where: { group_id: groupId, user_id: userId },
        })
        return !!request
    }
}

export default GroupJoinRequestRepository