import jwt, { SignOptions } from "jsonwebtoken";
import { IJwtPayload } from "@/types/models/user.interface";
import { JWT_EXPIRES_IN, JWT_SECRET } from "@/config";

class JwtUtil {
    private readonly secret: string;
    private readonly options: SignOptions;

    constructor() {
        this.secret = JWT_SECRET;
        this.options = {
            expiresIn: (JWT_EXPIRES_IN || "7d") as SignOptions["expiresIn"],
        };
    }

    sign(payload: IJwtPayload): string {
        return jwt.sign(payload, this.secret, this.options);
    }

    verify(token: string): IJwtPayload {
        return jwt.verify(token, this.secret) as IJwtPayload;
    }
}

export default new JwtUtil();