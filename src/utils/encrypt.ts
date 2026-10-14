import crypto from "crypto";
import { ENCRYPTION_SECRET } from "@/config";
import { DcryptPayload } from "@/types/general/crypto.interface";

const ALGORITHM = "aes-256-gcm";
const SECRET_KEY = Buffer.from(ENCRYPTION_SECRET, 'hex');

export const encrypt = (value: string) => {
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(
        ALGORITHM,
        SECRET_KEY,
        iv
    );

    let encrypted = cipher.update(value, 'utf-8', 'hex');

    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
        encrypted,
        iv: iv.toString("hex"),
        tag: tag.toString("hex")
    }
}

export const dcrypt = (data: DcryptPayload) => {
    const { encrypted, iv, tag } = data;

    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        SECRET_KEY,
        Buffer.from(iv, 'hex')
    )

    decipher.setAuthTag(Buffer.from(tag, "hex"));

    let decrypted = decipher.update(encrypted, "hex", "utf-8");

    decrypted += decipher.final("utf8");

    return decrypted;
}

/**
 * Encrypt a JWT token into a compact string format: iv.tag.encrypted
 */
export const encryptToken = (token: string): string => {
    const { encrypted, iv, tag } = encrypt(token);
    return `${iv}.${tag}.${encrypted}`;
};

/**
 * Decrypt a token from cookie string format: iv.tag.encrypted
 * Returns null if invalid, corrupted, or tampered
 */
export const decryptToken = (encryptedToken: string): string | null => {
    try {
        if (!encryptedToken || typeof encryptedToken !== "string") return null;
        const parts = encryptedToken.split(".");
        if (parts.length !== 3) return null;
        const [iv, tag, encrypted] = parts;
        if (!iv || !tag || !encrypted) return null;

        return dcrypt({ encrypted, iv, tag });
    } catch {
        return null;
    }
};