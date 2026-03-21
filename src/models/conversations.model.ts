import {
    Column,
    DataType,
    Model,
    Table,
    ForeignKey,
    BelongsTo,
} from "sequelize-typescript";
import { IConversation } from "@/types/models/conversations.interface";
import User from "@/models/user.model";

@Table({
    tableName: "conversations",
    timestamps: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
})
export default class Conversation extends Model<IConversation> implements IConversation {

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
    sender_id: number;

    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    receiver_id: number;

    // User who started the conversation
    @BelongsTo(() => User, "sender_id")
    sender: User;

    // User who received the conversation
    @BelongsTo(() => User, "receiver_id")
    receiver: User;
}