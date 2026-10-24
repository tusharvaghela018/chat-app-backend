import {
    Column,
    DataType,
    Model,
    Table,
    ForeignKey,
    BelongsTo,
} from "sequelize-typescript";
import User from "@/models/user.model";
import Message from "@/models/message.model";
import { IMessageReaction } from "@/types/models/message-reaction.interface";

@Table({
    tableName: "message_reactions",
    timestamps: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
})
export default class MessageReaction extends Model<IMessageReaction> implements IMessageReaction {

    @Column({
        primaryKey: true,
        autoIncrement: true,
        type: DataType.INTEGER,
        allowNull: false,
    })
    id: number;

    @ForeignKey(() => Message)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    message_id: number;

    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    user_id: number;

    @Column({
        type: DataType.STRING(16),
        allowNull: false,
    })
    emoji: string;

    @BelongsTo(() => Message, "message_id")
    message: Message;

    @BelongsTo(() => User, "user_id")
    user: User;

    created_at: Date;
    updated_at: Date;
    deleted_at: Date;
}
