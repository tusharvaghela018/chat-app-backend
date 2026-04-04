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

        // Use a dedicated client for blocking operations if needed, 
        // but here the client is already connected.
        
        while (true) {
            try {
                // blPop blocks until an item is available or timeout (0 = wait forever)
                // Returns { key: string, element: string } or null
                const result = await client.blPop(MAIL_QUEUE_KEY, 0);
                
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
            } catch (innerError) {
                logger.error("Error processing mail job:", innerError);
                // Avoid rapid failure loop
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    } catch (error) {
        logger.error("Failed to start mail worker:", error);
    }
};
