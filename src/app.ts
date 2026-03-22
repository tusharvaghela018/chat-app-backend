import express, { NextFunction, Request, Response } from "express";
import http from "http";
import expressWinston from "express-winston";
import cors from "cors";
import { Routes } from "@/types/general/route.interface";
import { NODE_ENV, PORT } from "@/config";
import logger from "@/utils/logger";
import db from "@/models";
import RedisClient from "@/config/Redis";
import SocketServer from "@/config/Socket";
import PassportConfig from "@/config/Passport";
import AppError from "@/utils/appError";
import { sendResponse } from "@/utils";

class App {
    public app: express.Application;
    public env: string;
    public port: number;
    private server?: http.Server;

    constructor(routes: Routes[]) {
        this.app = express();
        this.env = NODE_ENV || "development";
        this.port = Number(PORT) || 5000;
        this.initializeMiddleware();
        this.initializeRoutes(routes);
        this.createServer();
        this.app.use(new PassportConfig().initialize())
        this.app.use(
            expressWinston.errorLogger({
                winstonInstance: logger,
            }),
        );

        this.initializeErrorHandling()
    }

    public listen = async () => {
        this.server?.listen(this.port, () => {
            console.info(`=================================`);
            console.info(`======= ENV: ${this.env} =======`);
            console.info(`🚀 App listening on the port ${this.port}`);
            console.info(`=================================`);
        });
        await this.connectToDB();
        await this.connectRedis();
    };

    private initializeMiddleware = () => {
        this.app.set("view engine", "ejs");
        this.app.use(
            cors({
                origin: true,
                credentials: true,
            }),
        );
        //log for the incoming http request at info level.
        this.app.use(
            expressWinston.logger({
                winstonInstance: logger,
                meta: true,
                msg: "{{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms",
                expressFormat: false,
                colorize: true,
            }),
        );

        this.app.use("/", express.static("public"));
        this.app.use(
            express.json({
                limit: "50mb",
            }),
        );
        this.app.use(
            express.urlencoded({
                extended: true,
            }),
        );
    };

    private initializeRoutes = (routes: Routes[]) => {
        this.app.get("/", (_, res: Response) => {
            res.status(200).json("Server is running");
        });

        routes.forEach(route => {
            this.app.use("/", route.router);
        });

        // 404 handler — unknown routes
        this.app.use((req: Request, res: Response, next: NextFunction) => {
            next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
        });
    };

    private createServer = () => {
        this.server = http.createServer(this.app);

        const socketServer = SocketServer.getInstance()
        //Initialize base socket first
        socketServer.initialize(this.server);
    };

    private connectToDB = async (): Promise<void> => {
        try {
            await db.authenticate();
            console.info("Connected to DB successfully.");
        } catch (error) {
            console.error("Failed to connect to DB", error);
        }
    };

    private connectRedis = async () => {
        const redis = RedisClient.getInstance();
        await redis.connect();
    }

    private initializeErrorHandling = () => {
        this.app.use((err: any, _: Request, res: Response, _next: NextFunction) => {

            // 🔹 AppError (custom errors)
            if (err instanceof AppError) {
                return sendResponse({
                    res,
                    statusCode: err.statusCode,
                    success: false,
                    message: err.message,
                    error: err.errors || null, // 👈 support detailed errors
                    show_toast: true
                });
            }

            // 🔹 Sequelize Errors
            if (
                err.name === "SequelizeValidationError" ||
                err.name === "SequelizeUniqueConstraintError"
            ) {
                const errors = err.errors?.map((e: any) => ({
                    field: e.path,
                    message: e.message
                }));

                return sendResponse({
                    res,
                    statusCode: 400,
                    success: false,
                    message: errors?.[0]?.message || "Validation error",
                    error: errors || null,
                    show_toast: true
                });
            }

            // 🔹 JWT Errors
            if (err.name === "JsonWebTokenError") {
                return sendResponse({
                    res,
                    statusCode: 401,
                    success: false,
                    message: "Invalid token",
                    error: null,
                    show_toast: true
                });
            }

            if (err.name === "TokenExpiredError") {
                return sendResponse({
                    res,
                    statusCode: 401,
                    success: false,
                    message: "Token expired",
                    error: null,
                    show_toast: true
                });
            }

            // 🔹 Unknown / Server Error
            logger.error(err);

            return sendResponse({
                res,
                statusCode: 500,
                success: false,
                message:
                    this.env === "development"
                        ? err.message
                        : "Internal server error",
                error:
                    this.env === "development"
                        ? err.stack // 👈 show stack in dev
                        : null,
                show_toast: true
            });
        });
    };
}

export default App;