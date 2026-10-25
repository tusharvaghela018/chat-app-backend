import { Router } from "express"
import UploadController from "@/controllers/upload.controller"
import AuthMiddleware from "@/middlewares/auth.middleware"
import uploadMiddleware from "@/middlewares/upload.middleware"

class UploadRoute {
    public path = "/upload"
    public router = Router()
    public uploadController = new UploadController()
    public authMiddleware = new AuthMiddleware()

    constructor() {
        this.initializeRoutes()
    }

    private initializeRoutes() {
        this.router.post(
            `${this.path}/media`,
            this.authMiddleware.authenticate,
            uploadMiddleware.mediaUpload,
            this.uploadController.uploadMedia
        )

        this.router.get(
            `${this.path}/download`,
            this.authMiddleware.softAuthenticate,
            this.uploadController.downloadFile
        )
    }
}

export default UploadRoute
