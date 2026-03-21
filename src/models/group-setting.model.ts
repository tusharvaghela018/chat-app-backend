import {
    Column, DataType, Model, Table,
    ForeignKey, BelongsTo,
} from "sequelize-typescript";
import Group from "@/models/group.model";
import { IGroupSetting } from "@/types/models/group-setting.interface";

@Table({
    tableName: "group_settings",
    timestamps: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
})
export default class GroupSetting extends Model<IGroupSetting> implements IGroupSetting {

    @Column({ primaryKey: true, autoIncrement: true, type: DataType.INTEGER })
    id: number;

    @ForeignKey(() => Group)
    @Column({ type: DataType.INTEGER, allowNull: false, unique: true })
    group_id: number;

    @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: "members" })
    who_can_send: "members" | "admins";

    @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: "admins" })
    who_can_edit_info: "admins" | "members";

    @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: "admins" })
    who_can_add_members: "admins" | "members";

    @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: "admins" })
    who_can_remove_members: "admins";

    @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: "admins" })
    who_can_share_link: "admins" | "members";

    @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: "admins" })
    who_can_change_settings: "admins";

    // ── Association ───────────────────────────────────────────
    @BelongsTo(() => Group, "group_id")
    group: Group;
}