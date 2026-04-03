import { createClient, RedisClientType } from "redis";
import { REDIS_URL } from "@/config";

class RedisClient {
    private static instance: RedisClient;
    private client: RedisClientType;

    private constructor() {
        this.client = createClient({
            url: REDIS_URL,
            socket: {
                tls: true, // 🔥 REQUIRED for Upstash
                reconnectStrategy: (retries) => {
                    console.log(`Redis reconnect attempt: ${retries}`);
                    return Math.min(retries * 50, 2000);
                },
            },
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
        // 🔥 Prevent multiple connections
        if (!this.client.isOpen) {
            await this.client.connect();
        }
    }

    public getClient(): RedisClientType {
        return this.client;
    }
}

export default RedisClient;