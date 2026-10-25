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
import GroupMessage from "@/models/group-message.model";
import { IStarredMessage } from "@/types/models/starred-message.interface";

@Table({
    tableName: "starred_messages",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
})
export default class StarredMessage extends Model<IStarredMessage> implements IStarredMessage {

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
    user_id: number;

    @ForeignKey(() => Message)
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    message_id: number | null;

    @ForeignKey(() => GroupMessage)
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    group_message_id: number | null;

    @BelongsTo(() => User, "user_id")
    user: User;

    @BelongsTo(() => Message, "message_id")
    message: Message;

    @BelongsTo(() => GroupMessage, "group_message_id")
    groupMessage: GroupMessage;

    created_at: Date;
    updated_at: Date;
}
