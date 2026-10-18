import { Request } from "express";
import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from "passport-jwt";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { GOOGLE_CALLBACK_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET } from "@/config";
import { IJwtPayload } from "@/types/models/user.interface";
import UserRepository from "@/repositories/user.repository";
import { decryptToken } from "@/utils/encrypt";

const parseCookieHeader = (cookieHeader?: string): Record<string, string> => {
    if (!cookieHeader) return {};
    return cookieHeader.split(";").reduce((acc, str) => {
        const [k, ...v] = str.trim().split("=");
        if (k) acc[k] = decodeURIComponent(v.join("="));
        return acc;
    }, {} as Record<string, string>);
};

const cookieExtractor = (req: Request): string | null => {
    let token: string | null = null;
    if (req) {
        const parsedHeader = parseCookieHeader(req.headers?.cookie);
        const rawCookie =
            req.cookies?.auth_token ||
            req.cookies?.token ||
            parsedHeader.auth_token ||
            parsedHeader.token;

        if (rawCookie) {
            token = decryptToken(rawCookie) || rawCookie;
        }
    }
    return token;
};

class PassportConfig {

    private userRepo: UserRepository

    constructor() {
        this.userRepo = new UserRepository()
        this.initJwtStrategy()
        this.initGoogleStrategy()
    }

    private initJwtStrategy(): void {
        const options: StrategyOptions = {
            jwtFromRequest: ExtractJwt.fromExtractors([
                cookieExtractor
            ]),
            secretOrKey: JWT_SECRET
        }

        passport.use(
            new JwtStrategy(options, async (payload: IJwtPayload, done) => {
                try {
                    const user = await this.userRepo.findById(payload.id)
                    if (!user) {
                        return done(null, false)
                    }
                    return done(null, user)
                } catch (error) {
                    return done(error, false)
                }
            })
        )
    }

    // ─── Google OAuth Strategy ────────────────────────────────────────
    private initGoogleStrategy(): void {
        passport.use(new GoogleStrategy(
            {
                clientID: GOOGLE_CLIENT_ID,
                clientSecret: GOOGLE_CLIENT_SECRET,
                callbackURL: GOOGLE_CALLBACK_URL
            },
            async (_accessToken, _refreshToken, profile, done) => {
                try {
                    const { user } = await this.userRepo.googleLogin(profile)
                    return done(null, user);
                }
                catch (error) {
                    return done(null, false, { message: error?.message })
                }
            }
        ))
    }

    initialize() {
        return passport.initialize()
    }
}

export default PassportConfig