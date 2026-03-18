import fs from "fs";
import path from "path";
import { Sequelize } from "sequelize-typescript";
import { DATABASE_URL, NODE_ENV } from "@/config";
import logger from "@/utils/logger";

if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
}

const db = new Sequelize(DATABASE_URL, {
    dialect: "postgres",
    logging: (sql, timing) => {
        logger.debug(`[${timing}ms] ${sql}`);
    },
    benchmark: true,
    pool: {
        max: NODE_ENV === "production" ? 80 : 45,
        min: 2,
        acquire: 30000,
        idle: 10000,
    },
});

// 🔹 Auto-load models
const basename = path.basename(module.filename);

const models = fs
    .readdirSync(__dirname)
    .filter(file => {
        return file !== basename && file !== "interfaces" && !file.endsWith(".d.ts") && (file.endsWith(".js") || file.endsWith(".ts"));
    })
    .map(file => require(path.join(__dirname, file)).default);

db.addModels(models);

export default db;
