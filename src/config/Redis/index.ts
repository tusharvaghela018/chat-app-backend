import { createClient, RedisClientType } from "redis";
import { NODE_ENV, REDIS_URL } from "@/config";
import logger from "@/utils/logger";

class RedisClient {
    private static instance: RedisClient;
    private client: RedisClientType;

    private constructor() {
        this.client = createClient({
            url: REDIS_URL,
            socket: (NODE_ENV !== 'development'
                ? {
                    tls: true,
                    reconnectStrategy: (retries: number) => Math.min(retries * 100, 10000),
                }
                : {
                    reconnectStrategy: (retries: number) => Math.min(retries * 100, 10000),
                }) as any,
        });

        this.client.on("connect", () => {
            console.log("Redis Connected");
        });

        this.client.on("ready", () => {
            console.log("Redis Ready");
        });

        this.client.on("end", () => {
            console.log("Redis Disconnected");
        });

        this.client.on("reconnecting", () => {
            console.log("Redis Reconnecting...");
        });

        this.client.on("error", (err) => {
            console.error("Redis Error:", err);
        });
    }

    public static getInstance(): RedisClient {
        if (!RedisClient.instance) {
            RedisClient.instance = new RedisClient();
        }
        return RedisClient.instance;
    }

    public async connect() {
        if (!this.client.isOpen) {
            await this.client.connect();
        }
    }

    public getClient(): RedisClientType {
        return this.client;
    }

    /**
     * Check if connection is healthy
     */
    public async isHealthy(): Promise<boolean> {
        try {
            if (!this.client.isOpen) return false;
            await this.client.ping();
            return true;
        } catch (error) {
            logger.error(error)
            return false;
        }
    }
}

export default RedisClient;
