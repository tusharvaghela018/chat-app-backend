import { IUserSession } from "@/types/models/user-session.interface";
import {
    BelongsTo,
    Column,
    DataType,
    ForeignKey,
    Model,
    Table,
} from "sequelize-typescript";
import User from "./user.model";

@Table({
    tableName: "user_sessions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
})
export default class UserSession extends Model<IUserSession> implements IUserSession {
    @Column({
        primaryKey: true,
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        allowNull: false,
    })
    id: string;

    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    user_id: number;

    @BelongsTo(() => User, { onDelete: "CASCADE" })
    user: User;

    @Column({
        type: DataType.STRING(50),
        allowNull: false,
        defaultValue: "desktop",
    })
    device_type: string;

    @Column({
        type: DataType.STRING(150),
        allowNull: false,
        defaultValue: "Unknown Device",
    })
    device_name: string;

    @Column({
        type: DataType.STRING(100),
        allowNull: false,
        defaultValue: "Unknown Browser",
    })
    browser: string;

    @Column({
        type: DataType.STRING(100),
        allowNull: false,
        defaultValue: "Unknown OS",
    })
    os: string;

    @Column({
        type: DataType.STRING(100),
        allowNull: false,
        defaultValue: "127.0.0.1",
    })
    ip_address: string;

    @Column({
        type: DataType.STRING(200),
        allowNull: true,
        defaultValue: "Local Network",
    })
    location: string;

    @Column({
        type: DataType.STRING(100),
        allowNull: true,
    })
    city: string;

    @Column({
        type: DataType.STRING(100),
        allowNull: true,
    })
    region: string;

    @Column({
        type: DataType.STRING(100),
        allowNull: true,
    })
    country: string;

    @Column({
        type: DataType.STRING(10),
        allowNull: true,
    })
    country_code: string;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    })
    is_revoked: boolean;

    @Column({
        type: DataType.DATE,
        allowNull: false,
        defaultValue: DataType.NOW,
    })
    last_active_at: Date;

    @Column({
        type: DataType.DATE,
        allowNull: false,
        defaultValue: DataType.NOW,
    })
    created_at: Date;

    @Column({
        type: DataType.DATE,
        allowNull: false,
        defaultValue: DataType.NOW,
    })
    updated_at: Date;
}
