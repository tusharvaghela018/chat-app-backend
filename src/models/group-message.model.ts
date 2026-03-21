import {
    Column, DataType, Model, Table,
    ForeignKey, BelongsTo, HasMany,
} from "sequelize-typescript";
import User from "@/models/user.model";
import Group from "@/models/group.model";
import GroupMessageSeen from "@/models/group-message-seen.model";
import { IGroupMessage } from "@/types/models/group-message.interface";

@Table({
    tableName: "group_messages",
    timestamps: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
})
export default class GroupMessage extends Model<IGroupMessage> implements IGroupMessage {

    @Column({ primaryKey: true, autoIncrement: true, type: DataType.INTEGER })
    id: number;

    @ForeignKey(() => Group)
    @Column({ type: DataType.INTEGER, allowNull: false })
    group_id: number;

    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: true }) // null for system messages
    sender_id: number;

    @Column({ type: DataType.TEXT, allowNull: false })
    content: string;

    @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: "text" })
    type: "text" | "system";

    // ── Associations ──────────────────────────────────────────
    @BelongsTo(() => Group, "group_id")
    group: Group;

    @BelongsTo(() => User, "sender_id")
    sender: User;

    @HasMany(() => GroupMessageSeen, "message_id")
    seenBy: GroupMessageSeen[];
}