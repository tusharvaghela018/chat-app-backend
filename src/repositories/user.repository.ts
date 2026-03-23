import { LoginDTO, RegisterDTO, ForgotPasswordDTO, ResetPasswordDTO } from "@/dtos/auth.dto";
import { IUser } from "@/types/models/user.interface";
import User from "@/models/user.model";
import BaseRepository from "@/repositories";
import jwtUtil from "@/utils/jwt.util";
import { Profile } from "passport-google-oauth20";
import { Op } from "sequelize";
import AppError from "@/utils/appError";
import emailService from "@/services/email.service";

class UserRepository extends BaseRepository<User> {
    constructor() {
        super(User);
    }

    // ─── Forgot Password ─────────────────────────────────────────────
    readonly forgotPassword = async (data: ForgotPasswordDTO): Promise<void> => {
        const { email } = data;
        const user = await this.findOne({ where: { email } });

        if (!user) {
            throw new AppError("User not found with this email", 404);
        }

        // Generate a JWT token for password reset using the default expiration
        const resetToken = jwtUtil.sign(
            { id: user.id!, email: user.email }
        );

        await emailService.sendPasswordResetEmail(user.email, resetToken);
    };

    // ─── Reset Password ──────────────────────────────────────────────
    readonly resetPassword = async (data: ResetPasswordDTO): Promise<void> => {
        const { token, password } = data;

        try {
            // Verify the JWT token
            const decoded = jwtUtil.verify(token);

            const user = await this.findById(decoded.id);

            if (!user) {
                throw new AppError("User no longer exists", 404);
            }

            // Update user's password
            await user.update({
                password,
            });
        } catch (error: any) {
            if (error.name === "TokenExpiredError") {
                throw new AppError("Reset token has expired", 400);
            }
            if (error.name === "JsonWebTokenError") {
                throw new AppError("Invalid reset token", 400);
            }
            throw error;
        }
    };

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

    readonly getUserList = async ({
        userId,
        search,
        page = 1,
        limit = 20,
    }: {
        userId: number
        search?: string
        page?: number
        limit?: number
    }) => {
        const offset = (page - 1) * limit

        const whereClause: any = {
            id: { [Op.ne]: userId }
        }

        if (search) {
            whereClause[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } },
            ]
        }

        const { rows, count } = await this.findAndCountAll({
            where: whereClause,
            attributes: ["id", "name", "avatar", "is_online", "email"],
            limit,
            offset,
            order: [["name", "ASC"]],
        })

        const totalPages = Math.ceil(count / limit)

        return {
            users: rows,
            count,                  // total matching records
            total_pages: totalPages,
            per_page: limit,
            page,
            hasMore: page < totalPages,
        }
    }
}

export default UserRepository;
