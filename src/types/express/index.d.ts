declare global {
    namespace Express {
        interface Request {
            user?: import("../../models/user.model").default;  // ← relative path, not alias
        }
    }
}

export { };