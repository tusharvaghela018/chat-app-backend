import { Request, Response } from "express"
import { Readable } from "stream"
import asyncHandler, { sendResponse } from "@/utils"
import cloudinary from "@/config/cloudinary"
import { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from "@/config"
import { validateFileBuffer } from "@/utils/file-validator"

class UploadController {
    private uploadToCloudinary(
        buffer: Buffer,
        originalname: string,
        category: "image" | "pdf" | "audio" | "document"
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            const cleanName = (originalname || "attachment")
                .replace(/\.[^/.]+$/, "")
                .replace(/[^a-zA-Z0-9_-]/g, "_")
            const public_id = `${Date.now()}_${cleanName}`

            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: "chat-app/media",
                    resource_type: category === "image" ? "image" : category === "audio" ? "video" : "auto",
                    public_id,
                    flags: "attachment",
                },
                (error, result) => {
                    if (error) return reject(error)
                    resolve(result)
                }
            )
            stream.end(buffer)
        })
    }

    readonly uploadMedia = asyncHandler(async (req: Request, res: Response) => {
        if (!req.file) {
            return sendResponse({
                res,
                statusCode: 400,
                message: "No file uploaded",
                success: false,
                show_toast: true,
            })
        }

        const file = req.file
        const name = file.originalname || "attachment"
        const declaredMime = file.mimetype || "application/octet-stream"

        // ── 1. Strict Magic Bytes & Signature Inspection ──────────────────────
        const validation = validateFileBuffer(file.buffer, declaredMime, name)
        if (!validation.isValid) {
            return sendResponse({
                res,
                statusCode: 400,
                message: validation.error || "File security check failed: invalid file format",
                success: false,
                show_toast: true,
            })
        }

        // ── 2. Stream Verified Buffer to Cloudinary ───────────────────────────
        try {
            const category = validation.category as "image" | "pdf" | "audio" | "document"
            const cloudinaryResult = await this.uploadToCloudinary(file.buffer, name, category)
            const url = cloudinaryResult.secure_url || cloudinaryResult.url
            const size = file.size || cloudinaryResult.bytes || 0
            const type = validation.detectedMime || declaredMime
            const duration = req.body?.duration ? Number(req.body.duration) : undefined

            return sendResponse({
                res,
                data: {
                    url,
                    name,
                    size,
                    type,
                    category, // 'image' | 'pdf' | 'audio' | 'document'
                    duration,
                },
                message: "Media verified and uploaded successfully",
                success: true,
            })
        } catch (uploadError: any) {
            console.error("Cloudinary upload failed:", uploadError)
            return sendResponse({
                res,
                statusCode: 500,
                message: "Cloud storage upload failed",
                success: false,
                show_toast: true,
            })
        }
    })

    /**
     * Download Proxy for Cloudinary Files
     * Resolves 401 Unauthorized errors caused by Cloudinary's default
     * "PDF and ZIP files delivery" restriction by generating a signed private download URL.
     */
    readonly downloadFile = asyncHandler(async (req: Request, res: Response) => {
        const fileUrl = req.query.url as string
        const originalName = (req.query.name as string) || "download"
        const isInline = req.query.inline === "true" || req.query.disposition === "inline"

        if (!fileUrl) {
            return sendResponse({
                res,
                statusCode: 400,
                message: "File URL is required",
                success: false,
            })
        }

        // Security check: Only allow downloading from Cloudinary res.cloudinary.com
        if (!fileUrl.startsWith("https://res.cloudinary.com/")) {
            return sendResponse({
                res,
                statusCode: 400,
                message: "Invalid file URL: only Cloudinary media is supported",
                success: false,
            })
        }

        try {
            // Cloudinary URL parsing: extract resource_type, public_id, and format/extension
            // e.g.: https://res.cloudinary.com/<cloud_name>/<resource_type>/upload/(v<version>/)?<public_id>.<ext>
            const cldRegex = /res\.cloudinary\.com\/[^/]+\/(image|raw|video)\/upload\/(?:v\d+\/)?(.+?)(\.[^.]*)?$/
            const match = fileUrl.match(cldRegex)

            let targetUrl = fileUrl

            if (match) {
                const resource_type = (match[1] as any) || "image"
                const public_id = decodeURIComponent(match[2])
                const format = match[3] ? match[3].replace(".", "") : undefined

                try {
                    // Generate signed private download URL using Cloudinary SDK
                    // This bypasses the default account-level block on PDF & ZIP delivery
                    targetUrl = cloudinary.utils.private_download_url(public_id, format, {
                        resource_type,
                        type: "upload",
                        expires_at: Math.floor(Date.now() / 1000) + 3600,
                        attachment: !isInline,
                    })
                } catch (signErr) {
                    console.warn("Failed to generate Cloudinary private download URL:", signErr)
                    targetUrl = fileUrl
                }
            }

            let response = await fetch(targetUrl)

            // If the signed URL failed (e.g. 404/401) and resource_type was 'image', try 'raw'
            if (!response.ok && match && match[1] === "image") {
                try {
                    const rawSignedUrl = cloudinary.utils.private_download_url(
                        decodeURIComponent(match[2]),
                        match[3] ? match[3].replace(".", "") : undefined,
                        {
                            resource_type: "raw",
                            type: "upload",
                            expires_at: Math.floor(Date.now() / 1000) + 3600,
                            attachment: !isInline,
                        }
                    )
                    const retryRes = await fetch(rawSignedUrl)
                    if (retryRes.ok) {
                        response = retryRes
                    }
                } catch {}
            }

            // Fallback: If still not ok and targetUrl was signed, try direct fetch
            if (!response.ok && targetUrl !== fileUrl) {
                try {
                    const fallbackRes = await fetch(fileUrl)
                    if (fallbackRes.ok) {
                        response = fallbackRes
                    }
                } catch {}
            }

            if (!response.ok) {
                console.error(`Failed to fetch from Cloudinary: ${response.status} ${response.statusText}`)
                return sendResponse({
                    res,
                    statusCode: 502,
                    message: `Cloud storage error (${response.status}): ${response.statusText}`,
                    success: false,
                })
            }

            const contentType = response.headers.get("content-type") || "application/octet-stream"
            const contentLength = response.headers.get("content-length")

            const safeFilename = originalName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "")
            const disposition = isInline ? "inline" : "attachment"
            res.setHeader(
                "Content-Disposition",
                `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(originalName)}`
            )
            res.setHeader("Content-Type", contentType)
            if (contentLength) {
                res.setHeader("Content-Length", contentLength)
            }

            if (response.body) {
                Readable.fromWeb(response.body as any).pipe(res)
            } else {
                const buffer = Buffer.from(await response.arrayBuffer())
                res.send(buffer)
            }
        } catch (downloadErr: any) {
            console.error("Backend file download proxy failed:", downloadErr?.message)
            return sendResponse({
                res,
                statusCode: 502,
                message: "Failed to download file from cloud storage",
                success: false,
            })
        }
    })
}

export default UploadController
