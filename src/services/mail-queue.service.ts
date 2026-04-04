import RedisClient from "@/config/Redis";
import logger from "@/utils/logger";

const MAIL_QUEUE_KEY = "mail_queue";

export interface MailJob {
    type: "password-reset";
    data: any;
}

class MailQueueService {
    private redisClient = RedisClient.getInstance();

    public async push(job: MailJob) {
        try {
            await this.redisClient.connect();
            const client = this.redisClient.getClient();
            await client.rPush(MAIL_QUEUE_KEY, JSON.stringify(job));
            logger.info(`Email pushed to queue: ${job.type}`);
        } catch (error) {
            logger.error("Error pushing to mail queue:", error);
        }
    }
}

export default new MailQueueService();
