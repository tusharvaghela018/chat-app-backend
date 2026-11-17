import UserSession from "@/models/user-session.model";
import { DeviceInfo } from "@/utils/device.util";
import { Op } from "sequelize";

export class UserSessionRepository {
    readonly createSession = async (userId: number, deviceInfo: DeviceInfo): Promise<UserSession> => {
        return await UserSession.create({
            user_id: userId,
            device_type: deviceInfo.device_type,
            device_name: deviceInfo.device_name,
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            ip_address: deviceInfo.ip_address,
            location: deviceInfo.location,
            city: deviceInfo.city || undefined,
            region: deviceInfo.region || undefined,
            country: deviceInfo.country || undefined,
            country_code: deviceInfo.country_code || undefined,
            is_revoked: false,
            last_active_at: new Date(),
        });
    };

    readonly getActiveSessions = async (userId: number) => {
        return await UserSession.findAll({
            where: {
                user_id: userId,
                is_revoked: false,
            },
            order: [["last_active_at", "DESC"]],
        });
    };

    readonly findById = async (sessionId: string) => {
        return await UserSession.findByPk(sessionId);
    };

    readonly touchSession = async (sessionId: string) => {
        await UserSession.update(
            { last_active_at: new Date() },
            {
                where: {
                    id: sessionId,
                    is_revoked: false,
                },
            }
        );
    };

    readonly revokeSession = async (userId: number, sessionId: string): Promise<boolean> => {
        const [affectedCount] = await UserSession.update(
            { is_revoked: true },
            {
                where: {
                    id: sessionId,
                    user_id: userId,
                    is_revoked: false,
                },
            }
        );
        return affectedCount > 0;
    };

    readonly revokeAllOtherSessions = async (userId: number, currentSessionId: string): Promise<number> => {
        const [affectedCount] = await UserSession.update(
            { is_revoked: true },
            {
                where: {
                    user_id: userId,
                    id: { [Op.ne]: currentSessionId },
                    is_revoked: false,
                },
            }
        );
        return affectedCount;
    };

    readonly revokeAllSessions = async (userId: number): Promise<number> => {
        const [affectedCount] = await UserSession.update(
            { is_revoked: true },
            {
                where: {
                    user_id: userId,
                    is_revoked: false,
                },
            }
        );
        return affectedCount;
    };
}

export default new UserSessionRepository();
