import User from "@/models/user.model";
import callRepository, { CallRepository } from "@/repositories/call.repository";
import asyncHandler, { sendResponse } from "@/utils";
import { Request, Response } from "express";

class CallController {
    private callRepo: CallRepository;
    constructor() {
        this.callRepo = callRepository;
    }

    readonly getCallHistory = asyncHandler(async (req: Request, res: Response) => {
        const userId = (req.user as User).id;
        const page = req.query.page ? Number(req.query.page) : 1;
        const limit = req.query.limit ? Number(req.query.limit) : 50;
        const offset = (page - 1) * limit;

        const data = await this.callRepo.getUserCallHistory(userId, { limit, offset });

        return sendResponse({
            res,
            data: {
                calls: data.rows,
                total: data.count,
                page,
                limit,
            },
            success: true,
        });
    });
}

export default new CallController();
