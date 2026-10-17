import { FRONTEND_URL, SMTP_FROM, BREVO_API_KEY } from "@/config";
import logger from "@/utils/logger";

class EmailService {
    constructor() {
        if (BREVO_API_KEY) {
            logger.info("Email service initialized with Brevo API");
        } else {
            logger.warn("BREVO_API_KEY is not configured in environment variables");
        }
    }

    public async verifyConnection(): Promise<boolean> {
        return Boolean(BREVO_API_KEY && BREVO_API_KEY.trim());
    }

    public async sendPasswordResetEmail(email: string, token: string) {
        const resetLink = `${FRONTEND_URL}/auth/reset-password?token=${token}`;
        const sanitizedBrevoKey = BREVO_API_KEY?.trim().replace(/^["']|["']$/g, '');

        logger.info(`Password reset requested for: ${email}`);

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

        // 1. Send via Brevo API
        if (sanitizedBrevoKey) {
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

        // 2. Fallback when running locally without a Brevo API key
        logger.info(`[LOCAL DEV] Password reset link for ${email}: ${resetLink}`);
        return { dev_fallback: true, link: resetLink };
    }
}

export default new EmailService();
