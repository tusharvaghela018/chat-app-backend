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