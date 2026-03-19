import dotEnv from "dotenv";
dotEnv.config();

export const { DATABASE_URL, NODE_ENV, PORT, REDIS_URL, JWT_SECRET, JWT_EXPIRES_IN, GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL, FRONTEND_URL } = process.env;
