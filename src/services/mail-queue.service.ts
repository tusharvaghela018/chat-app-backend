import RedisClient from "@/config/Redis";
import logger from "@/utils/logger";

const MAIL_QUEUE_KEY = "mail_queue";

export interface MailJob {
    type: "password-reset";
    data: any;
}

class MailQueueService {
    private redisClient = RedisClient.getInstance();

    public async push(job: MailJob, retryCount = 0) {
        try {
            await this.redisClient.connect();
            const client = this.redisClient.getClient();

            // Perform simple health check before pushing
            const isHealthy = await this.redisClient.isHealthy();
            if (!isHealthy) {
                logger.warn("Redis client not healthy, reconnecting before push...");
            }

            await client.rPush(MAIL_QUEUE_KEY, JSON.stringify(job));
            logger.info(`Email pushed to queue: ${job.type}`);
        } catch (error: any) {
            logger.error(`Error pushing to mail queue (Attempt ${retryCount + 1}):`, error.message);

            // Retry once for ECONNRESET or other transient network errors
            if (retryCount < 1 && (error.code === 'ECONNRESET' || error.message.includes('closed'))) {
                logger.info("Retrying push to mail queue...");
                await new Promise(resolve => setTimeout(resolve, 500));
                return this.push(job, retryCount + 1);
            }

            throw error;
        }
    }

    public async getQueueLength(): Promise<number> {
        try {
            await this.redisClient.connect();
            const client = this.redisClient.getClient();
            return await client.lLen(MAIL_QUEUE_KEY);
        } catch (error) {
            logger.error(error)
            return -1;
        }
    }
}

export default new MailQueueService();
