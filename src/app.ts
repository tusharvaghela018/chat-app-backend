import express, { Request, Response } from "express";
import http from "http";
import expressWinston from "express-winston";
import cors from "cors";
import { Routes } from "@/interfaces/general/route.interface";
import { NODE_ENV, PORT } from "@/config";
import logger from "@/utils/logger";
import db from "@/models";
import RedisClient from "@/config/Redis";
import SocketServer from "@/config/Socket";

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
        this.app.use(
            expressWinston.errorLogger({
                winstonInstance: logger,
            }),
        );
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
        this.app.get("/", (req: Request, res: Response) => {
            res.status(200).json("Server is running");
        });

        routes.forEach(route => {
            this.app.use("/", route.router);
        });

        this.app.use((req: Request, res: Response) => {
            res.status(404).json({ message: "Route not found" });
        });

        this.app.use((err: any, req: Request, res: Response) => {
            logger.error(err);
            res.status(500).json({ message: "Internal server Error !" });
        });
    };

    private createServer = () => {
        this.server = http.createServer(this.app);

        const socketServer = SocketServer.getInstance()
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
}

export default App;
