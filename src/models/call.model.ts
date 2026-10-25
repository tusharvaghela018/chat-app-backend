import {
    Column,
    DataType,
    Model,
    Table,
    ForeignKey,
    BelongsTo,
} from "sequelize-typescript";
import User from "@/models/user.model";
import Conversation from "@/models/conversations.model";
import { ICall, CallType, CallStatus } from "@/types/models/call.interface";

@Table({
    tableName: "calls",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
})
export default class Call extends Model<ICall> implements ICall {
    @Column({
        primaryKey: true,
        autoIncrement: true,
        type: DataType.INTEGER,
        allowNull: false,
    })
    id: number;

    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    caller_id: number;

    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    receiver_id: number;

    @ForeignKey(() => Conversation)
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    conversation_id: number | null;

    @Column({
        type: DataType.ENUM("audio", "video"),
        allowNull: false,
        defaultValue: "audio",
    })
    type: CallType;

    @Column({
        type: DataType.ENUM("completed", "missed", "declined", "busy", "cancelled"),
        allowNull: false,
        defaultValue: "missed",
    })
    status: CallStatus;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        defaultValue: 0,
    })
    duration: number;

    @Column({
        type: DataType.DATE,
        allowNull: false,
        defaultValue: DataType.NOW,
    })
    started_at: Date;

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    ended_at: Date | null;

    @BelongsTo(() => User, "caller_id")
    caller: User;

    @BelongsTo(() => User, "receiver_id")
    receiver: User;

    @BelongsTo(() => Conversation, "conversation_id")
    conversation: Conversation;

    created_at: Date;
    updated_at: Date;
}
