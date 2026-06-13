import { mailQueue } from "@/shared/queues/mail.queue";
import logger from "@/utils/logger";

export interface MailJob {
    type: "password-reset";
    data: any;
}

class MailQueueService {
    public async push(job: MailJob) {
        try {
            await mailQueue.add(job.type, job.data);
            logger.info(`Email added to BullMQ: ${job.type}`);
        } catch (error: any) {
            logger.error(`Error adding to mail queue:`, error.message);
            throw error;
        }
    }

    public async getQueueLength(): Promise<number> {
        try {
            const counts = await mailQueue.getJobCounts();
            return counts.waiting + counts.active + counts.delayed;
        } catch (error) {
            logger.error(error)
            return -1;
        }
    }
}

export default new MailQueueService();
