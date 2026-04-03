import { CloudinaryStorage } from "multer-storage-cloudinary"
import multer, { Multer } from "multer"
import cloudinary from "@/config/cloudinary"

class UploadMiddleware {
    private static createUploader(folder: string, allowedFormats: string[]): Multer {
        const storage = new CloudinaryStorage({
            cloudinary,
            params: {
                folder,
                allowed_formats: allowedFormats,
                transformation: [{ width: 400, height: 400, crop: "fill" }],
            } as any,
        })

        return multer({
            storage,
            limits: { fileSize: 10 * 1024 * 1024 }, // 5MB
        })
    }

    // ── group avatar ──────────────────────────────────────────────────────
    public groupAvatar = UploadMiddleware.createUploader(
        "chat-app/groups",
        ["jpg", "jpeg", "png", "webp"]
    ).single("avatar")

    // ── user avatar ───────────────────────────────────────────────────────
    public userAvatar = UploadMiddleware.createUploader(
        "chat-app/users",
        ["jpg", "jpeg", "png", "webp"]
    ).single("avatar")
}

export default new UploadMiddleware()