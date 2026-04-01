import { FRONTEND_URL } from "@/config";
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

    readonly softAuthenticate = (req: Request, res: Response, next: NextFunction) => {
        passport.authenticate("jwt", { session: false }, (err: Error, user: User) => {
            if (user) {
                req.user = user;
            }
            next()
        })(req, res, next)
    }

    readonly passportMiddleware = async (req: Request, res: Response, next: NextFunction) => {
        passport.authenticate('google', { session: false }, (err, user, info) => {
            if (err) {
                res.redirect(`${FRONTEND_URL}/auth/error?message=SERVER_ERROR`)
                return;
            }

            if (!user) {
                res.redirect(`${FRONTEND_URL}/auth/error?message=${info?.message || 'GOOGLE_AUTH_FAILED'}`)
                return;
            }

            req.user = user;
            next()
        })(req, res, next)
    }
}

export default AuthMiddleware