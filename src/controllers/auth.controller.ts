import { FRONTEND_URL } from "@/config";
import User from "@/models/user.model";
import UserRepository from "@/repositories/user.repository";
import asyncHandler, { sendResponse } from "@/utils";
import AppError from "@/utils/appError";
import jwtUtil from "@/utils/jwt.util";
import type { Request, Response } from "express";

import emailService from "@/services/email.service";
import TwoFactorService from "@/services/2fa.service";
import bcrypt from "bcrypt";
import userSessionRepository from "@/repositories/user-session.repository";
import { extractDeviceInfo } from "@/utils/device.util";
import SocketServer from "@/config/Socket";

class AuthController {
    private userRepo: UserRepository
    private twoFactorService: TwoFactorService

    constructor() {
        this.userRepo = new UserRepository()
        this.twoFactorService = new TwoFactorService()
    }

    public getMailStatus = asyncHandler(async (req: Request, res: Response) => {
        const brevoConfigured = await emailService.verifyConnection();

        return sendResponse({
            res,
            message: "Mail System Status",
            data: {
                provider: "Brevo API",
                status: brevoConfigured ? "Ready" : "Missing API Key",
                env: process.env.NODE_ENV || "development"
            }
        });
    });

    public login = asyncHandler(async (req: Request, res: Response) => {
        const { user, token, requires2FA } = await this.userRepo.login(req.body);

        if (requires2FA) {
            return sendResponse({
                res,
                message: "2FA required",
                data: { token, requires_2fa: true },
                show_toast: false
            });
        }

        const deviceInfo = extractDeviceInfo(req);
        let sessionId: string | undefined;
        try {
            const session = await userSessionRepository.createSession((user as any).id, deviceInfo);
            sessionId = session?.id;
        } catch (sessionErr) {
            console.error("Session creation warning on login:", sessionErr);
        }

        const authToken = jwtUtil.sign({
            id: (user as any).id,
            email: (user as any).email,
            ...(sessionId ? { sessionId } : {})
        });

        return sendResponse({
            res,
            message: "Logged in successfully",
            data: { user },
            auth_token: authToken,
            show_toast: true
        });
    });

    public register = asyncHandler(async (req: Request, res: Response) => {
        const { user } = await this.userRepo.register(req.body);

        const deviceInfo = extractDeviceInfo(req);
        let sessionId: string | undefined;
        try {
            const session = await userSessionRepository.createSession((user as any).id, deviceInfo);
            sessionId = session?.id;
        } catch (sessionErr) {
            console.error("Session creation warning on login:", sessionErr);
        }

        const authToken = jwtUtil.sign({
            id: (user as any).id,
            email: (user as any).email,
            ...(sessionId ? { sessionId } : {})
        });

        return sendResponse({
            res,
            data: { user },
            message: "Signup successfully",
            auth_token: authToken,
            show_toast: true
        });
    });

    public forgotPassword = asyncHandler(async (req: Request, res: Response) => {
        await this.userRepo.forgotPassword(req.body)
        return sendResponse({ res, message: "Password reset link sent to your email", show_toast: true })
    });

    public resetPassword = asyncHandler(async (req: Request, res: Response) => {
        await this.userRepo.resetPassword(req.body)
        return sendResponse({ res, message: "Password reset successfully", show_toast: true })
    });

    public googleCallback = asyncHandler(async (req: Request, res: Response) => {
        const user = req.user as User;

        if (user.two_factor_enabled) {
            const token = jwtUtil.sign(
                { id: user.id, email: user.email, isPreAuth: true },
                { expiresIn: "5m" }
            );
            return res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}&requires_2fa=true`);
        }

        const deviceInfo = extractDeviceInfo(req);
        const session = await userSessionRepository.createSession(user.id, deviceInfo);
        const token = jwtUtil.sign({ id: user.id, email: user.email, sessionId: session.id });

        res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
    });

    public verifyLogin2FA = asyncHandler(async (req: Request, res: Response) => {
        const { token, code, recovery_code } = req.body;

        if (!token || (!code && !recovery_code)) {
            throw new AppError("Token and verification code are required", 400);
        }

        try {
            // 1. Verify the Pre-Auth Token
            const decoded = jwtUtil.verify(token);

            if (!decoded.isPreAuth) {
                throw new AppError("Invalid or expired pre-authentication token", 401);
            }

            // 2. Fetch User
            const user = await this.userRepo.findById(decoded.id);
            if (!user || !user.two_factor_enabled) {
                throw new AppError("User not found or 2FA not enabled", 404);
            }

            // 3. Verify TOTP Code OR Recovery Code
            let isValid = false;

            // Try TOTP first if code is numeric
            if (code && /^\d+$/.test(code)) {
                const encryptedSecret = {
                    encrypted: user.two_factor_secret!,
                    iv: user.two_factor_iv!,
                    tag: user.two_factor_tag!
                };

                isValid = await this.twoFactorService.verifyTwofactorCode({
                    encryptedSecret,
                    code
                });
            }

            // If TOTP fails, try Recovery Codes
            if (!isValid && recovery_code && user.two_factor_recovery_codes) {
                const recoveryCodes: string[] = JSON.parse(user.two_factor_recovery_codes);
                const matchedIndex = await (async () => {
                    for (let i = 0; i < recoveryCodes.length; i++) {
                        if (await bcrypt.compare(recovery_code, recoveryCodes[i])) return i;
                    }
                    return -1;
                })();

                if (matchedIndex !== -1) {
                    isValid = true;
                    // Remove the used recovery code
                    recoveryCodes.splice(matchedIndex, 1);
                    await user.update({
                        two_factor_recovery_codes: JSON.stringify(recoveryCodes)
                    });
                }
            }

            if (!isValid) {
                throw new AppError("Invalid verification code", 401);
            }

            // 4. Issue Final Access Token with Session
            const deviceInfo = extractDeviceInfo(req);
            const session = await userSessionRepository.createSession(user.id, deviceInfo);
            const accessToken = jwtUtil.sign({ id: user.id, email: user.email, sessionId: session.id });

            return sendResponse({
                res,
                message: "Logged in successfully",
                data: {
                    user: (this.userRepo as any).sanitize(user)
                },
                auth_token: accessToken,
                show_toast: true
            });

        } catch (error: any) {
            console.log(`Here is the error : ${error}`)
            if (error.name === "TokenExpiredError") {
                throw new AppError("Pre-auth token has expired", 401);
            }
            if (error.name === "JsonWebTokenError") {
                throw new AppError("Invalid pre-auth token", 401);
            }
            throw error;
        }
    });

    public getMe = asyncHandler(async (req: Request, res: Response) => {
        const user = await this.userRepo.findOne({
            where: {
                id: (req.user as User).id
            }
        })

        if (!user) {
            throw new AppError('User Not Found', 404)
        }

        return sendResponse({ res, data: { user: (this.userRepo as any).sanitize(user) } })
    });

    public setup2FA = asyncHandler(async (req: Request, res: Response) => {
        const user = req.user as User;

        if (user?.two_factor_enabled) {
            throw new AppError("Two-factor authentication is already enabled", 400);
        }

        const { qrcode, uri, secret } = await this.twoFactorService.generateTwoFactorSecret(user?.email);

        // Store the encrypted secret temporarily as a JSON string
        await user.update({
            two_factor_secret: secret.encrypted,
            two_factor_iv: secret.iv,
            two_factor_tag: secret.tag
        });

        return sendResponse({
            res,
            message: "2FA setup initiated",
            data: { qrcode, uri },
            show_toast: false
        });
    });

    public verifyAndEnable2FA = asyncHandler(async (req: Request, res: Response) => {
        const user = req.user as User;
        const { code } = req.body;

        if (!code) {
            throw new AppError("Verification token is required", 400);
        }

        if (!user.two_factor_secret) {
            throw new AppError("2FA setup has not been initiated", 400);
        }

        const encryptedSecret = {
            encrypted: user?.two_factor_secret,
            iv: user?.two_factor_iv,
            tag: user?.two_factor_tag
        };
        const isValid = await this.twoFactorService.verifyTwofactorCode({
            encryptedSecret,
            code
        });

        if (!isValid) {
            throw new AppError("Invalid verification code", 400);
        }

        // Generate recovery codes
        const recoveryCodes = Array.from({ length: 8 }, () =>
            Math.random().toString(36).substring(2, 10).toUpperCase()
        );

        // Hash recovery codes before storing
        const hashedRecoveryCodes = await Promise.all(
            recoveryCodes.map(code => bcrypt.hash(code, 10))
        );

        await user.update({
            two_factor_enabled: true,
            two_factor_recovery_codes: JSON.stringify(hashedRecoveryCodes)
        });

        return sendResponse({
            res,
            message: "Two-factor authentication enabled successfully",
            data: { recovery_codes: recoveryCodes }, // Send plain text codes to user ONCE
            show_toast: true
        });
    });

    public disable2FA = asyncHandler(async (req: Request, res: Response) => {
        const user = req.user as User;
        const { code } = req.body;

        if (!user.two_factor_enabled) {
            throw new AppError("Two-factor authentication is not enabled", 400);
        }

        let isValid = false;

        // Try TOTP first if token is numeric
        if (/^\d+$/.test(code)) {
            const encryptedSecret = {
                encrypted: user.two_factor_secret!,
                iv: user.two_factor_iv!,
                tag: user.two_factor_tag!
            };

            isValid = await this.twoFactorService.verifyTwofactorCode({
                encryptedSecret,
                code
            });
        }

        // If TOTP fails, try Recovery Codes
        const verificationCode = code?.toUpperCase();
        if (!isValid && verificationCode && user.two_factor_recovery_codes) {
            const recoveryCodes: string[] = JSON.parse(user.two_factor_recovery_codes);
            for (const hashedCode of recoveryCodes) {
                if (await bcrypt.compare(verificationCode, hashedCode)) {
                    isValid = true;
                    break;
                }
            }
        }

        if (!isValid) {
            throw new AppError("Invalid verification code", 400);
        }

        await user.update({
            two_factor_enabled: false,
            two_factor_secret: null,
            two_factor_iv: null,
            two_factor_tag: null,
            two_factor_recovery_codes: null
        });

        return sendResponse({
            res,
            message: "Two-factor authentication disabled successfully",
            show_toast: true
        });
    });

    public getSocketToken = asyncHandler(async (req: Request, res: Response) => {
        const user = req.user as any;
        const token = jwtUtil.sign(
            { id: user.id, email: user.email, sessionId: user?.sessionId },
            { expiresIn: "10m" }
        );
        return sendResponse({
            res,
            data: { token },
            message: "Socket token generated",
            show_toast: false
        });
    });

    public exchangeToken = asyncHandler(async (req: Request, res: Response) => {
        const { token } = req.body;
        if (!token) throw new AppError("Token is required", 400);
        const decoded = jwtUtil.verify(token);
        const user = await this.userRepo.findById(decoded.id);
        if (!user) throw new AppError("User not found", 404);

        if (decoded.sessionId) {
            const session = await userSessionRepository.findById(decoded.sessionId);
            if (!session || session.is_revoked) {
                throw new AppError("Session is revoked or expired", 401);
            }
        }

        return sendResponse({
            res,
            data: { user: (this.userRepo as any).sanitize(user) },
            message: "Cookie established",
            auth_token: token,
            show_toast: false
        });
    });

    public logout = asyncHandler(async (req: Request, res: Response) => {
        const user = req.user as any;
        if (user?.id && user?.sessionId) {
            await userSessionRepository.revokeSession(user.id, user.sessionId);
            SocketServer.getInstance().revokeSessionSockets(user.sessionId);
        }

        return sendResponse({
            res,
            message: "Logged out successfully",
            data: null,
            clearAuthToken: true,
            show_toast: true
        });
    });

    public getSessions = asyncHandler(async (req: Request, res: Response) => {
        const user = req.user as any;
        const currentSessionId = user?.sessionId || null;
        const sessions = await userSessionRepository.getActiveSessions(user.id);

        const formatted = sessions.map(s => ({
            id: s.id,
            device_type: s.device_type,
            device_name: s.device_name,
            browser: s.browser,
            os: s.os,
            ip_address: s.ip_address,
            location: s.location || "Unknown Location",
            city: s.city,
            region: s.region,
            country: s.country,
            country_code: s.country_code,
            last_active_at: s.last_active_at,
            created_at: s.created_at,
            is_current: currentSessionId ? s.id === currentSessionId : false,
        }));

        return sendResponse({
            res,
            message: "Sessions retrieved successfully",
            data: {
                sessions: formatted,
                total: formatted.length,
                current_session_id: currentSessionId
            },
            show_toast: false
        });
    });

    public revokeSession = asyncHandler(async (req: Request, res: Response) => {
        const user = req.user as any;
        const rawId = req.params.id;
        const sessionId = (Array.isArray(rawId) ? rawId[0] : rawId) as string;

        if (!sessionId) {
            throw new AppError("Session ID is required", 400);
        }

        const revoked = await userSessionRepository.revokeSession(user.id, sessionId);
        if (!revoked) {
            throw new AppError("Session not found or already revoked", 404);
        }

        // Real-time disconnect remote socket
        SocketServer.getInstance().revokeSessionSockets(sessionId);

        const isCurrent = user.sessionId === sessionId;

        return sendResponse({
            res,
            message: isCurrent ? "Current session ended" : "Device logged out successfully",
            data: { revoked: true, is_current: isCurrent },
            clearAuthToken: isCurrent,
            show_toast: true
        });
    });

    public revokeOtherSessions = asyncHandler(async (req: Request, res: Response) => {
        const user = req.user as any;
        const currentSessionId = user?.sessionId;

        if (!currentSessionId) {
            throw new AppError("Current session ID not recognized", 400);
        }

        const count = await userSessionRepository.revokeAllOtherSessions(user.id, currentSessionId);

        // Real-time disconnect all other remote sockets for this user
        SocketServer.getInstance().revokeUserOtherSessions(user.id, currentSessionId);

        return sendResponse({
            res,
            message: `Logged out of ${count} other device${count === 1 ? "" : "s"}`,
            data: { revoked_count: count },
            show_toast: true
        });
    });
}

export default AuthController;
