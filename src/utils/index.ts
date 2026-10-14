import { FRONTEND_URL, NODE_ENV } from "@/config";
import { CookieOptions, Response } from "express";
import { encryptToken } from "@/utils/encrypt";

export const getAuthCookieOptions = (): CookieOptions => {
    const rawEnv = (process.env.NODE_ENV || NODE_ENV || "").replace(/['"]/g, "").trim().toLowerCase();
    const isHttps = rawEnv === "production" || !!FRONTEND_URL?.startsWith("https");

    return {
        httpOnly: true,
        secure: isHttps,
        sameSite: (isHttps ? "none" : "lax") as "none" | "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        ...(isHttps ? { partitioned: true } : {})
    };
};

export const setAuthCookie = (res: Response, token: string): void => {
    const encryptedToken = encryptToken(token);
    res.cookie("auth_token", encryptedToken, getAuthCookieOptions());
};

export const clearAuthCookie = (res: Response): void => {
    res.clearCookie("auth_token", getAuthCookieOptions());
};

export interface ISendResponseCookie {
    name: string;
    value: string;
    options?: CookieOptions;
    encrypt?: boolean;
}

export interface SendResponseParams {
    res: Response;
    statusCode?: number;
    success?: boolean;
    message?: string;
    data?: any;
    error?: any;
    show_toast?: boolean;
    auth_token?: string;
    clearAuthToken?: boolean;
    cookies?: ISendResponseCookie | ISendResponseCookie[];
    clearCookies?: string | string[];
}

export const sendResponse = ({
    res,
    statusCode = 200,
    success = true,
    message = "",
    data = null,
    error = null,
    show_toast = false,
    auth_token,
    clearAuthToken,
    cookies,
    clearCookies
}: SendResponseParams) => {
    // 1. Handle auth_token if provided
    if (auth_token) {
        setAuthCookie(res, auth_token);
    }

    // 2. Handle clearAuthToken if requested
    if (clearAuthToken) {
        clearAuthCookie(res);
    }

    // 3. Handle custom cookies if provided
    if (cookies) {
        const cookieList = Array.isArray(cookies) ? cookies : [cookies];
        cookieList.forEach(c => {
            const val = c.encrypt ? encryptToken(c.value) : c.value;
            res.cookie(c.name, val, c.options || getAuthCookieOptions());
        });
    }

    // 4. Handle clearing custom cookies if provided
    if (clearCookies) {
        const clearList = Array.isArray(clearCookies) ? clearCookies : [clearCookies];
        clearList.forEach(name => {
            res.clearCookie(name, getAuthCookieOptions());
        });
    }

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