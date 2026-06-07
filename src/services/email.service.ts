import nodemailer from "nodemailer";
import { FRONTEND_URL, NODE_ENV, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, BREVO_API_KEY } from "@/config";
import logger from "@/utils/logger";

class EmailService {
    private transporter: nodemailer.Transporter | null = null;

    constructor() {
        if (NODE_ENV !== "production") {
            this.transporter = nodemailer.createTransport({
                host: SMTP_HOST,
                port: Number(SMTP_PORT) || 587,
                secure: Number(SMTP_PORT) === 465,
                auth: {
                    user: SMTP_USER,
                    pass: SMTP_PASS,
                },
                tls: {
                    rejectUnauthorized: false
                },
                debug: false,
                logger: false
            });

            this.transporter.verify((error) => {
                if (error) {
                    logger.error("SMTP Connection Error:", error);
                } else {
                    logger.info("Nodemailer server is ready (Development)");
                }
            });
        } else {
            logger.info("Email service initialized with Brevo API (Production)");
        }
    }

    public async verifyConnection() {
        if (NODE_ENV !== "production") {
            if (!this.transporter) return false;
            try {
                const timeout = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("SMTP Connection Timeout")), 5000)
                );
                await Promise.race([this.transporter.verify(), timeout]);
                return true;
            } catch (error) {
                logger.error("Nodemailer verification failed:", error);
                return false;
            }
        } else {
            // Check Brevo API health
            return !!BREVO_API_KEY;
        }
    }

    public async sendPasswordResetEmail(email: string, token: string) {
        const resetLink = `${FRONTEND_URL}/auth/reset-password?token=${token}`;

        if (NODE_ENV !== "production") {
            logger.info(`[DEV] Password reset link for ${email}: ${resetLink}`);
        }

        const subject = "Reset your password";
        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h1 style="color: #333;">Password Reset Request</h1>
                <p style="color: #555;">You requested a password reset. Click the button below to reset your password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
                </div>
                <p style="margin-top: 20px; font-size: 0.9em; color: #777;">This link will expire in 1 hour.</p>
                <p style="font-size: 0.9em; color: #777;">If you didn't request this, please ignore this email.</p>
            </div>
        `;

        const sanitizedBrevoKey = BREVO_API_KEY?.trim().replace(/^["']|["']$/g, '');

        // 1. Production Mode: Use Brevo API
        if (NODE_ENV === "production" && sanitizedBrevoKey) {
            try {
                const response = await fetch("https://api.brevo.com/v3/smtp/email", {
                    method: "POST",
                    headers: {
                        "accept": "application/json",
                        "content-type": "application/json",
                        "api-key": sanitizedBrevoKey
                    },
                    body: JSON.stringify({
                        sender: {
                            name: "Nexus App",
                            email: SMTP_FROM || "tusharvaghela5027@gmail.com"
                        },
                        to: [{ email: email }],
                        subject: subject,
                        htmlContent: html
                    })
                });

                const result = await response.json();
                if (!response.ok) {
                    logger.error(`Brevo API rejection: ${JSON.stringify(result)}`);
                    throw new Error(result.message || "Brevo API error");
                }

                logger.info(`Email sent via Brevo: ${result.messageId}`);
                return result;
            } catch (error: any) {
                logger.error(`Brevo Service Error: ${error.message}`);
                throw error;
            }
        } 
        
        // 2. Development Mode: Fallback to Nodemailer
        if (this.transporter) {
            const mailOptions = {
                from: SMTP_FROM || '"Nexus App" <tusharvaghela5027@gmail.com>',
                to: email,
                subject: subject,
                html: html
            };

            try {
                const info = await this.transporter.sendMail(mailOptions);
                logger.info("Message sent via Nodemailer: %s", info.messageId);
                return info;
            } catch (err: any) {
                logger.error("Nodemailer Service Error:", err.message);
                return { dev_fallback: true, link: resetLink, error: err.message };
            }
        } else {
            // Ultimate fallback for dev if no transporter exists
            return { dev_fallback: true, link: resetLink };
        }
    }
}

export default new EmailService();
