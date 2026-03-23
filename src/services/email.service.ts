import nodemailer from "nodemailer";
import { FRONTEND_URL, NODE_ENV, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } from "@/config";
import logger from "@/utils/logger";

class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT) || 587,
            secure: Number(SMTP_PORT) === 465, // true for 465, false for other ports
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });

        // Verify transporter connection
        this.transporter.verify((error) => {
            if (error) {
                logger.error("SMTP Connection Error:", error);
            } else {
                logger.info("Email server is ready to take messages");
            }
        });
    }

    public async sendPasswordResetEmail(email: string, token: string) {
        const resetLink = `${FRONTEND_URL}/auth/reset-password?token=${token}`;

        // Always log the link in development for easy access
        if (NODE_ENV !== "production") {
            logger.info(`[DEV] Password reset link for ${email}: ${resetLink}`);
        }

        const mailOptions = {
            from: SMTP_FROM || '"Chat App" <no-reply@aetherflow.com>',
            to: email,
            subject: "Reset your password",
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h1 style="color: #333;">Password Reset Request</h1>
                    <p style="color: #555;">You requested a password reset. Click the button below to reset your password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
                    </div>
                    <p style="margin-top: 20px; font-size: 0.9em; color: #777;">This link will expire in 1 hour.</p>
                    <p style="font-size: 0.9em; color: #777;">If you didn't request this, please ignore this email.</p>
                </div>
            `,
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            logger.info("Message sent: %s", info.messageId);
            return info;
        } catch (err: any) {
            if (NODE_ENV !== "production") {
                logger.warn(`Email Service Error (Dev Fallback): Check terminal for link. Error: ${err.message}`);
                return { dev_fallback: true, link: resetLink };
            }
            logger.error("Email Service Error:", err);
            throw err;
        }
    }
}

export default new EmailService();
