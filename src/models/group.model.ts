import {
    Column, DataType, Model, Table,
    ForeignKey, BelongsTo, HasMany, HasOne,
} from "sequelize-typescript";
import User from "@/models/user.model";
import GroupMember from "@/models/group-member.model";
import GroupMessage from "@/models/group-message.model";
import GroupSetting from "@/models/group-setting.model";
import { IGroup } from "@/types/models/group.interface";

@Table({
    tableName: "groups",
    timestamps: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
})
export default class Group extends Model<IGroup> implements IGroup {

    @Column({ primaryKey: true, autoIncrement: true, type: DataType.INTEGER })
    id: number;

    @Column({ type: DataType.STRING(100), allowNull: false })
    name: string;

    @Column({ type: DataType.STRING(255), allowNull: true })
    description: string;

    @Column({ type: DataType.STRING, allowNull: true })
    avatar: string;

    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: false })
    created_by: number;

    @Column({ type: DataType.STRING(100), allowNull: true, unique: true })
    invite_token: string;

    @Column({ type: DataType.DATE, allowNull: true })
    invite_expires_at: Date;

    @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: "open" })
    join_mode: "open" | "approval";

    // ── Associations ──────────────────────────────────────────
    @BelongsTo(() => User, "created_by")
    creator: User;

    @HasOne(() => GroupSetting, "group_id")
    settings: GroupSetting;

    @HasMany(() => GroupMember, "group_id")
    members: GroupMember[];

    @HasMany(() => GroupMessage, "group_id")
    messages: GroupMessage[];
}