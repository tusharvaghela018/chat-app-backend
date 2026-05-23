import {
    Column,
    DataType,
    Model,
    Table,
    ForeignKey,
    BelongsTo,
    HasMany,
} from "sequelize-typescript";
import { IConversation } from "@/types/models/conversations.interface";
import User from "@/models/user.model";
import Message from "@/models/message.model";

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

    @Column({
        type: DataType.ENUM('pending', 'accepted', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
    })
    status: 'pending' | 'accepted' | 'rejected';

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    })
    blocked_by_sender: boolean;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    })
    blocked_by_receiver: boolean;

    // User who started the conversation
    @BelongsTo(() => User, "sender_id")
    sender: User;

    // User who received the conversation
    @BelongsTo(() => User, "receiver_id")
    receiver: User;

    @HasMany(() => Message)
    messages: Message[];

    created_at: Date;
    updated_at: Date;
    deleted_at: Date;
}