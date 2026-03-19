import User from "@/models/user.model";
import { sendResponse } from "@/utils";
import { NextFunction, Request, Response } from "express";
import passport from "passport";

class AuthMiddleware {
    readonly authenticate = (req: Request, res: Response, next: NextFunction) => {
        passport.authenticate("jwt", { session: false }, (err: Error, user: User) => {
            if (err || !user) {
                return sendResponse({ res: res, statusCode: 401, message: "Unauthorized" })
            }
            req.user = user;
            next()
        })(req, res, next)
    }
}

export default AuthMiddleware