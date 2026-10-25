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
            limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
            fileFilter: (_req, file, cb) => {
                const ext = (file.originalname || "").toLowerCase().split(".").pop() || ""
                if (!allowedFormats.includes(ext)) {
                    return cb(new Error(`Only ${allowedFormats.join(", ")} images are allowed`))
                }
                cb(null, true)
            },
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

    // ── general media (audio, docs, pdf, images) ───────────────────────────
    // Uses memoryStorage so the controller can perform deep magic-bytes inspection
    public mediaUpload = (() => {
        const storage = multer.memoryStorage()

        const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
            const parts = (file.originalname || "").toLowerCase().split(".")
            const ext = parts[parts.length - 1] || ""

            const blocked = [
                "exe", "bat", "cmd", "sh", "vbs", "js", "mjs", "jar", "scr", "pif", "com",
                "hta", "cpl", "msi", "php", "phtml", "py", "pl", "cgi", "ps1"
            ]

            if (blocked.includes(ext)) {
                return cb(new Error(`Executable files (.${ext}) are strictly blocked for security`))
            }

            cb(null, true)
        }

        return multer({
            storage,
            limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
            fileFilter,
        }).single("file")
    })()
}

export default new UploadMiddleware()