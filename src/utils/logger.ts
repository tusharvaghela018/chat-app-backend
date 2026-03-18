import path from "path";
import { createLogger, format, transports } from "winston";
import "winston-daily-rotate-file";

// Common log format: timestamp + level + message
const logFormat = format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`),
);

// Daily rotation transport factory
function createDailyTransport(level: string, subfolder = level) {
    return new transports.DailyRotateFile({
        level,
        dirname: path.join(process.cwd(), "logs", subfolder),
        filename: `%DATE%.${subfolder}.log`,
        datePattern: "YYYY-MM-DD",
        zippedArchive: false,
        // maxSize: "50m",
        maxFiles: "30d", // keep 1 month
    });
}

const logger = createLogger({
    // Lower this to 'silly' so *all* levels pass through Winston
    level: "silly",
    format: logFormat,
    transports: [
        // existing per‐level folders
        createDailyTransport("error"),
        createDailyTransport("warn"),
        createDailyTransport("info"),
        createDailyTransport("debug"),
        // catch-all “everything” transport
        createDailyTransport("silly", "all"),
        // console in dev
        new transports.Console({
            level: "debug",
            format: format.combine(format.colorize(), logFormat),
        }),
    ],
    exitOnError: false,
});

export default logger;
