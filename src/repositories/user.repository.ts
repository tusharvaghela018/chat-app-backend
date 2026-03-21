import { LoginDTO, RegisterDTO } from "@/dtos/auth.dto";
import { IUser } from "@/types/models/user.interface";
import User from "@/models/user.model";
import BaseRepository from "@/repositories";
import jwtUtil from "@/utils/jwt.util";
import { Profile } from "passport-google-oauth20";
import { Op } from "sequelize";
import AppError from "@/utils/appError";

class UserRepository extends BaseRepository<User> {
    constructor() {
        super(User);
    }

    // ─── Google OAuth Login / Register ───────────────────────────────
    readonly googleLogin = async (profile: Profile): Promise<{ user: Partial<User> }> => {
        const email = profile.emails?.[0]?.value;

        if (!email) throw new AppError("Google account has no email address");

        let user = await this.findOne({ where: { email } });

        if (!user) {
            user = await this.create({
                name: profile.displayName,
                email,
                google_id: profile.id,
                avatar: profile.photos?.[0]?.value ?? null,
            } as IUser);
        } else if (!user.google_id) {
            await user.update({ google_id: profile.id });
        }

        return { user: this.sanitize(user) };
    };

    // ─── Local Login ──────────────────────────────────────────────────
    readonly login = async (data: LoginDTO): Promise<{ user: Partial<User>; token: string }> => {
        const { email, password } = data
        const user = await this.findOne({ where: { email: email } });

        if (!user) {
            throw new AppError("Invalid email or password", 401);
        }

        if (!user.password) {
            // Account exists but was created via Google — no password set
            throw new AppError("This account uses Google Sign-In. Please login with Google");
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            throw new AppError("Invalid email or password", 401);
        }

        const token = jwtUtil.sign({ id: user.id, email: user.email });

        return { user: this.sanitize(user), token };
    };

    // ─── Register ─────────────────────────────────────────────────────
    readonly register = async (data: RegisterDTO): Promise<{ user: Partial<User>; token: string }> => {
        const { name, email, password } = data
        const existing = await this.findOne({ where: { email: email } });

        if (existing) {
            throw new AppError("Email is already registered");
        }

        const user = await this.create({
            name: name,
            email: email,
            password,
        } as IUser);

        const token = jwtUtil.sign({ id: user.id, email: user.email });

        return { user: this.sanitize(user), token };
    };

    // add this private helper at the bottom of the class
    private sanitize(user: User): Omit<User, "password"> {
        const userJson = user.toJSON() as any;
        delete userJson.password;
        return userJson;
    }

    readonly getUserList = async (userId: number) => {
        return await this.findAll({
            where: {
                id: { [Op.ne]: userId }
            },
            attributes: ['id', 'name', 'avatar', 'is_online', 'email']
        })
    }
}

export default UserRepository;