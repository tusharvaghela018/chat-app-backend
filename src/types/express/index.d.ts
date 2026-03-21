import GroupMember from "@/models/group-member.model";

declare global {
    namespace Express {
        interface Request {
            user?: User;
            groupMember?: GroupMember
            // ← relative path, not alias
        }
    }
}

export { };