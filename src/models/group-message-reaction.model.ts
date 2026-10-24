import {
    Column,
    DataType,
    Model,
    Table,
    ForeignKey,
    BelongsTo,
} from "sequelize-typescript";
import User from "@/models/user.model";
import GroupMessage from "@/models/group-message.model";
import { IGroupMessageReaction } from "@/types/models/message-reaction.interface";

@Table({
    tableName: "group_message_reactions",
    timestamps: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
})
export default class GroupMessageReaction extends Model<IGroupMessageReaction> implements IGroupMessageReaction {

    @Column({
        primaryKey: true,
        autoIncrement: true,
        type: DataType.INTEGER,
        allowNull: false,
    })
    id: number;

    @ForeignKey(() => GroupMessage)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    group_message_id: number;

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

    @BelongsTo(() => GroupMessage, "group_message_id")
    groupMessage: GroupMessage;

    @BelongsTo(() => User, "user_id")
    user: User;

    created_at: Date;
    updated_at: Date;
    deleted_at: Date;
}
