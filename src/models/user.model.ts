import { IUser } from "@/types/models/user.interface";
import {
    Column,
    DataType,
    Model,
    Table,
    BeforeCreate,
    BeforeUpdate
} from "sequelize-typescript";
import bcrypt from "bcrypt";

@Table({
    tableName: "users",
    timestamps: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at"
})
export default class User extends Model<IUser> implements IUser {

    @Column({
        primaryKey: true,
        autoIncrement: true,
        type: DataType.INTEGER,
        allowNull: false,
    })
    id: number;

    @Column({
        type: DataType.STRING(100),
        allowNull: false,
    })
    name: string;

    @Column({
        type: DataType.STRING(100),
        allowNull: false,
        unique: true
    })
    username: string;

    @Column({
        type: DataType.STRING(150),
        allowNull: false,
        unique: true
    })
    email: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    password: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    google_id: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    avatar: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false
    })
    is_online: boolean;

    // 🔐 HASH PASSWORD (CREATE + UPDATE)
    @BeforeCreate
    @BeforeUpdate
    static async hashPassword(user: User) {
        if (user.password && user.changed("password")) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
        }
    }

    // 🔑 COMPARE PASSWORD
    async comparePassword(plainPassword: string): Promise<boolean> {
        if (!this.password) return false;
        return await bcrypt.compare(plainPassword, this.password);
    }
}