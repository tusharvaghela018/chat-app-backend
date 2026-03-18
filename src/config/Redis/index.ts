import { createClient, RedisClientType } from "redis";
import { REDIS_URL } from "@/config";

class RedisClient {
    private static instance: RedisClient;
    private client: RedisClientType;

    private constructor() {
        this.client = createClient({
            url: REDIS_URL,
        });

        this.client.on("connect", () => {
            console.log("Redis Connected");
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
        await this.client.connect();
    }

    public getClient(): RedisClientType {
        return this.client;
    }
}

export default RedisClient;