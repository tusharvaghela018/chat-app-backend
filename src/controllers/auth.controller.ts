import logger from "@/utils/logger";
import type { Request, Response } from "express";

class AuthController {
    public login = async (req: Request, res: Response) => {
        try {
            console.log(req.body);
            res.status(201).json("success");
        } catch (error) {
            logger.error(error);
            res.status(500).json(error instanceof Error ? error.message : "Internal server error");
        }
    };
}

export default AuthController;
