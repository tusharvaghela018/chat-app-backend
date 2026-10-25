import { Op } from "sequelize";
import Call from "@/models/call.model";
import User from "@/models/user.model";
import Conversation from "@/models/conversations.model";
import { ICall } from "@/types/models/call.interface";

export class CallRepository {
    readonly create = async (data: ICall): Promise<Call> => {
        return Call.create(data);
    };

    readonly update = async (id: number, data: Partial<ICall>) => {
        return Call.update(data, {
            where: { id },
        });
    };

    readonly findById = async (id: number): Promise<Call | null> => {
        return Call.findByPk(id, {
            include: [
                {
                    model: User,
                    as: "caller",
                    attributes: ["id", "name", "username", "avatar"],
                },
                {
                    model: User,
                    as: "receiver",
                    attributes: ["id", "name", "username", "avatar"],
                },
            ],
        });
    };

    readonly getUserCallHistory = async (
        userId: number,
        options: { limit?: number; offset?: number } = {}
    ) => {
        const { limit = 50, offset = 0 } = options;

        return Call.findAndCountAll({
            where: {
                [Op.or]: [{ caller_id: userId }, { receiver_id: userId }],
            },
            limit,
            offset,
            order: [["started_at", "DESC"]],
            include: [
                {
                    model: User,
                    as: "caller",
                    attributes: ["id", "name", "username", "avatar", "is_online"],
                },
                {
                    model: User,
                    as: "receiver",
                    attributes: ["id", "name", "username", "avatar", "is_online"],
                },
                {
                    model: Conversation,
                    as: "conversation",
                    required: false,
                    attributes: ["id", "status"],
                },
            ],
        });
    };
}

export default new CallRepository();
