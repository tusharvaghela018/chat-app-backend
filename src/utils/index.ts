import { NODE_ENV } from "@/config";
import { Response } from "express";

export const sendResponse = ({
    res,
    statusCode = 200,
    success = true,
    message = "",
    data = null,
    error = null,
    show_toast = false
}: {
    res: Response;
    statusCode?: number;
    success?: boolean;
    message?: string;
    data?: any;
    error?: any;
    show_toast?: boolean
}) => {
    return res.status(statusCode).json({
        success,
        message,
        data,
        error: NODE_ENV === 'development' ? error : null,
        show_toast
    });
};


// utils/asyncHandler.ts
export const asyncHandler =
    (fn: any) =>
        (req: any, res: any, next: any) =>
            Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;