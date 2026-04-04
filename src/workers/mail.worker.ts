import RedisClient from "@/config/Redis";
import emailService from "@/services/email.service";
import logger from "@/utils/logger";

const MAIL_QUEUE_KEY = "mail_queue";

export const startMailWorker = async () => {
    const redisClient = RedisClient.getInstance();
    
    try {
        await redisClient.connect();
        const client = redisClient.getClient();
        
        logger.info("Mail worker started and waiting for jobs...");

        while (true) {
            try {
                // Perform simple health check to ensure connection is still alive
                const isHealthy = await redisClient.isHealthy();
                if (!isHealthy) {
                    logger.warn("Redis client not healthy in worker, waiting for reconnect...");
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    continue;
                }

                // Use 30s timeout instead of 0 to prevent some cloud providers from dropping idle connections
                const result = await client.blPop(MAIL_QUEUE_KEY, 30);
                
                if (result) {
                    const { element } = result;
                    const job = JSON.parse(element);
                    
                    logger.info(`Processing mail job: ${job.type}`);
                    
                    switch (job.type) {
                        case 'password-reset':
                            await emailService.sendPasswordResetEmail(job.data.email, job.data.token);
                            break;
                        default:
                            logger.warn(`Unknown mail job type: ${job.type}`);
                    }
                    
                    logger.info(`Successfully processed mail job: ${job.type}`);
                }
            } catch (innerError: any) {
                // If it's a timeout error or connection reset, just log and continue
                if (innerError.message.includes('ECONNRESET') || innerError.message.includes('closed')) {
                    logger.warn("Redis connection reset or closed in worker, will retry...");
                } else {
                    logger.error("Error processing mail job:", innerError);
                }
                
                // Wait for potential automatic reconnection
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    } catch (error) {
        logger.error("Failed to start mail worker loop:", error);
    }
};
