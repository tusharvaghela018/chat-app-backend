import {
    Column, DataType, Model, Table,
    ForeignKey, BelongsTo,
} from "sequelize-typescript";
import User from "@/models/user.model";
import Group from "@/models/group.model";
import { IGroupJoinRequest } from "@/types/models/group-join-request.interface";

@Table({
    tableName: "group_join_requests",
    timestamps: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
})
export default class GroupJoinRequest extends Model<IGroupJoinRequest> implements IGroupJoinRequest {

    @Column({ primaryKey: true, autoIncrement: true, type: DataType.INTEGER })
    id: number;

    @ForeignKey(() => Group)
    @Column({ type: DataType.INTEGER, allowNull: false })
    group_id: number;

    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: false })
    user_id: number;

    @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: "pending" })
    status: "pending" | "approved" | "rejected";

    @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
    requested_at: Date;

    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: true })
    reviewed_by: number;

    @Column({ type: DataType.DATE, allowNull: true })
    reviewed_at: Date;

    // ── Associations ──────────────────────────────────────────
    @BelongsTo(() => Group, "group_id")
    group: Group;

    @BelongsTo(() => User, "user_id")
    requester: User;

    @BelongsTo(() => User, "reviewed_by")
    reviewer: User;
}