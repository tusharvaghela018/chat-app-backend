import { Worker, Job } from "bullmq";
import emailService from "@/services/email.service";
import logger from "@/utils/logger";
import { REDIS_URL } from "@/config";
import { MAIL_QUEUE_NAME } from "@/shared/queues/mail.queue";

const connection = {
  url: REDIS_URL,
  tls: REDIS_URL?.startsWith('rediss://') ? {} : undefined
};

export const startMailWorker = () => {
  const worker = new Worker(
    MAIL_QUEUE_NAME,
    async (job: Job) => {
      logger.info(`Processing mail job: ${job.name} (ID: ${job.id})`);

      try {
        switch (job.name) {
          case "password-reset":
            await emailService.sendPasswordResetEmail(job.data.email, job.data.token);
            break;
          default:
            logger.warn(`Unknown mail job type: ${job.name}`);
        }
        logger.info(`Successfully processed mail job: ${job.name}`);
      } catch (error) {
        logger.error(`Failed to process mail job ${job.name}:`, error);
        throw error; // Rethrow to trigger BullMQ retry
      }
    },
    { 
        connection,
        concurrency: 5 // Process up to 5 emails in parallel
    }
  );

  worker.on("completed", (job) => {
    logger.info(`Job ${job.id} has completed!`);
  });

  worker.on("failed", (job, err) => {
    logger.error(`Job ${job?.id} has failed with ${err.message}`);
  });

  logger.info("BullMQ Mail worker started...");
};
