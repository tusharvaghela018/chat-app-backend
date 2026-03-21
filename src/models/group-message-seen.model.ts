import {
    Column, DataType, Model, Table,
    ForeignKey, BelongsTo,
} from "sequelize-typescript";
import User from "@/models/user.model";
import GroupMessage from "@/models/group-message.model";
import { IGroupMessageSeen } from "@/types/models/group-message-seen.interface";

@Table({
    tableName: "group_message_seen",
    timestamps: false, // only seen_at, no created_at/updated_at needed
})
export default class GroupMessageSeen extends Model<IGroupMessageSeen> implements IGroupMessageSeen {

    @Column({ primaryKey: true, autoIncrement: true, type: DataType.INTEGER })
    id: number;

    @ForeignKey(() => GroupMessage)
    @Column({ type: DataType.INTEGER, allowNull: false })
    message_id: number;

    @ForeignKey(() => User)
    @Column({ type: DataType.INTEGER, allowNull: false })
    user_id: number;

    @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
    seen_at: Date;

    // ── Associations ──────────────────────────────────────────
    @BelongsTo(() => GroupMessage, "message_id")
    message: GroupMessage;

    @BelongsTo(() => User, "user_id")
    user: User;
}