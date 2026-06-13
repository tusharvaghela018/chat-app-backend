import { Queue, ConnectionOptions } from "bullmq";
import { REDIS_URL } from "@/config";

const connection: ConnectionOptions = {
  url: REDIS_URL,
  // Upstash often requires explicit TLS options when using rediss://
  tls: REDIS_URL?.startsWith('rediss://') ? {} : undefined
};

export const MAIL_QUEUE_NAME = "mail-queue";

export const mailQueue = new Queue(MAIL_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});
