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
import { IMessage } from "@/types/models/message.model";
@Table({
    tableName: "messages",
    timestamps: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
})
export default class Message extends Model<IMessage> implements IMessage {

    @Column({
        primaryKey: true,
        autoIncrement: true,
        type: DataType.INTEGER,
        allowNull: false,
    })
    id: number;

    @ForeignKey(() => Conversation)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    conversation_id: number;

    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    sender_id: number;

    @Column({
        type: DataType.TEXT,
        allowNull: false,
    })
    content: string;

    // false = not seen by receiver yet
    // true  = receiver has opened and read this message
    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    })
    is_seen: boolean;

    // Who sent this message
    @BelongsTo(() => User, "sender_id")
    sender: User;

    // Which conversation this message belongs to
    @BelongsTo(() => Conversation, "conversation_id")
    conversation: Conversation;
}