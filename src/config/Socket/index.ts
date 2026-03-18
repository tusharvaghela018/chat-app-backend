import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";

class SocketServer {
    private static instance: SocketServer;
    private io!: Server;

    private constructor() { }

    public static getInstance(): SocketServer {
        if (!SocketServer.instance) {
            SocketServer.instance = new SocketServer();
        }
        return SocketServer.instance;
    }

    public initialize(server: HttpServer) {
        this.io = new Server(server, {
            cors: {
                origin: "*",
                credentials: true,
            },
        });

        this.io.on("connection", (socket: Socket) => {
            console.log("Socket connected:", socket.id);

            socket.on("disconnect", () => {
                console.log("Socket disconnected:", socket.id);
            });
        });
    }

    public getIO(): Server {
        if (!this.io) {
            throw new Error("Socket not initialized");
        }
        return this.io;
    }
}

export default SocketServer;