import { FRONTEND_URL } from "@/config";
import User from "@/models/user.model";
import UserRepository from "@/repositories/user.repository";
import asyncHandler, { sendResponse } from "@/utils";
import AppError from "@/utils/appError";
import jwtUtil from "@/utils/jwt.util";
import type { Request, Response } from "express";

import mailQueueService from "@/services/mail-queue.service";
import emailService from "@/services/email.service";
import RedisClient from "@/config/Redis";
import TwoFactorService from "@/services/2fa.service";
import bcrypt from "bcrypt";

class AuthController {
    private userRepo: UserRepository
    private twoFactorService: TwoFactorService

    constructor() {
        this.userRepo = new UserRepository()
        this.twoFactorService = new TwoFactorService()
    }

    public getMailStatus = asyncHandler(async (req: Request, res: Response) => {
        const redisHealthy = await RedisClient.getInstance().isHealthy();
        const smtpHealthy = await emailService.verifyConnection();
        const queueLength = await mailQueueService.getQueueLength();

        return sendResponse({
            res,
            message: "Mail System Status",
            data: {
                redis: redisHealthy ? "Connected" : "Disconnected",
                smtp: smtpHealthy ? "Ready" : "Error",
                pending_emails: queueLength,
                env: process.env.NODE_ENV || "development"
            }
        });
    });

    public login = asyncHandler(async (req: Request, res: Response) => {
        const { user, token, requires2FA } = await this.userRepo.login(req.body)

        if (requires2FA) {
            return sendResponse({
                res,
                message: "2FA required",
                data: { token, requires_2fa: true },
                show_toast: false
            })
        }

        return sendResponse({ res, message: "Logeed in successfully", data: { user, token }, show_toast: true })
    });

    public register = asyncHandler(async (req: Request, res: Response) => {
        const { user, token } = await this.userRepo.register(req.body)
        return sendResponse({ res, data: { user, token }, message: "Signup successfully", show_toast: true })
    })

    public forgotPassword = asyncHandler(async (req: Request, res: Response) => {
        await this.userRepo.forgotPassword(req.body)
        return sendResponse({ res, message: "Password reset link sent to your email", show_toast: true })
    })

    public resetPassword = asyncHandler(async (req: Request, res: Response) => {
        await this.userRepo.resetPassword(req.body)
        return sendResponse({ res, message: "Password reset successfully", show_toast: true })
    })

    public googleCallback = asyncHandler(async (req: Request, res: Response) => {
        const user = req.user as User;

        if (user.two_factor_enabled) {
            const token = jwtUtil.sign(
                { id: user.id, email: user.email, isPreAuth: true },
                { expiresIn: "5m" }
            );
            return res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}&requires_2fa=true`);
        }

        const token = jwtUtil.sign({ id: user.id, email: user.email });
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

            // 4. Issue Final Access Token
            const accessToken = jwtUtil.sign({ id: user.id, email: user.email });

            return sendResponse({
                res,
                message: "Logged in successfully",
                data: {
                    user: (this.userRepo as any).sanitize(user),
                    token: accessToken
                },
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
}

export default AuthController;
