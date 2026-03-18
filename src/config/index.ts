import dotEnv from "dotenv";
dotEnv.config();

export const { DATABASE_URL, NODE_ENV, PORT, REDIS_URL } = process.env;
