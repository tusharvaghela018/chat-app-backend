import {
    Column, DataType, Model, Table,
    ForeignKey, BelongsTo,
} from "sequelize-typescript";
import User from "@/models/user.model";
import Group from "@/models/group.model";
import { IGroupMember } from "@/types/models/group-member.interface";

@Table({
    tableName: "group_members",
    timestamps: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
})
export default class GroupMember extends Model<IGroupMember> implements IGroupMember {

    @Column({ primaryKey: true, autoIncrement: true, type: DataType.INTEGER })
    id: number;

    @ForeignKey(() => Group)
    @Column({ type: DataType.INTEGER, allowNull: false })
    group_id: number;

    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: false })
    user_id: number;

    @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: "member" })
    role: "admin" | "member";

    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: true })
    added_by: number;

    @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
    joined_at: Date;

    // updated when user opens the group — used for unread count
    @Column({ type: DataType.DATE, allowNull: true })
    last_read_at: Date;

    // ── Associations ──────────────────────────────────────────
    @BelongsTo(() => Group, "group_id")
    group: Group;

    @BelongsTo(() => User, "user_id")
    user: User;

    @BelongsTo(() => User, "added_by")
    addedByUser: User;
}