import { Request, Response } from "express"
import asyncHandler, { sendResponse } from "@/utils"

class UploadController {
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

        const file = req.file as any
        const url = file.path || file.secure_url || file.url
        const name = file.originalname || "attachment"
        const size = file.size || 0
        const type = file.mimetype || "application/octet-stream"
        const duration = req.body?.duration ? Number(req.body.duration) : undefined

        return sendResponse({
            res,
            data: {
                url,
                name,
                size,
                type,
                duration,
            },
            message: "Media uploaded successfully",
            success: true,
        })
    })
}

export default UploadController
