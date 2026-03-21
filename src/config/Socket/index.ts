import { CHAT_EVENTS } from "@/constants/socket.constants";
import User from "@/models/user.model";
import ConversationRepository from "@/repositories/conversation.repository";
import MessageRepository from "@/repositories/message.repository";
import jwtUtil from "@/utils/jwt.util";
import { Server as HttpServer } from "http";
import { Op } from "sequelize";
import { Server, Socket } from "socket.io";

class SocketServer {
    private static instance: SocketServer;
    private io!: Server;

    private conversationRepo = new ConversationRepository()
    private messageRepo = new MessageRepository()

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

        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth?.token ||
                    socket.handshake.headers.authorization?.split(" ")[1]

                if (!token) {
                    return next(new Error("No Token provided"))
                }

                const payLoad = jwtUtil.verify(token)
                const user = await User.findByPk(payLoad.id)
                const plainUser = user.toJSON()
                delete plainUser.password

                if (!plainUser) return next(new Error("User Not Found"))

                socket.data.user = plainUser;
                next()
            } catch (error) {
                next(error)
            }
        })

        this.io.on("connection", (socket: Socket) => {

            const { id: senderId } = socket.data.user
            socket.join(`user_${senderId}`)
            console.log(`User connected UserId : ${senderId}`);

            socket.on(CHAT_EVENTS.SEND_MESSAGE, async (data: { receiverId: number, content: string }) => {
                try {
                    const conversation = await this.conversationRepo.getConversation({ senderId: senderId, receiverId: data.receiverId })

                    const message = await this.messageRepo.create({
                        conversation_id: conversation.id,
                        sender_id: senderId,
                        content: data.content
                    })

                    const { id, content, conversation_id, sender_id, created_at } = message.toJSON()

                    const payload = {
                        id,
                        content,
                        sender_id,
                        conversation_id,
                        created_at
                    }

                    this.io.to(`user_${data.receiverId}`).emit(CHAT_EVENTS.RECEIVE_MESSAGE, payload)

                    socket.emit(CHAT_EVENTS.RECEIVE_MESSAGE, payload)

                } catch (error) {
                    console.log(error);
                }
            })

            socket.on(CHAT_EVENTS.MARK_SEEN, async ({ conversationId, senderId: sender_id }) => {
                const user = socket.data.user;

                await this.messageRepo.update(
                    { is_seen: true },
                    {
                        where: {
                            conversation_id: conversationId,
                            sender_id: { [Op.ne]: user.id }, // not current user
                        },
                    }
                );

                // notify sender
                this.io.to(`user_${sender_id}`).emit(CHAT_EVENTS.MESSAGES_SEEN, {
                    conversationId,
                });
            });


            socket.on(CHAT_EVENTS.TYPING_START, (data: { receiverId: number }) => {
                this.io.to(`user_${data.receiverId}`).emit(CHAT_EVENTS.TYPING, {
                    senderId,
                    isTyping: true
                })
            })

            socket.on(CHAT_EVENTS.TYPING_STOP, (data: { receiverId: number }) => {
                this.io.to(`user_${data.receiverId}`).emit(CHAT_EVENTS.TYPING, {
                    senderId,
                    isTyping: false
                })
            })

            socket.on("disconnect", () => {
                console.log(`User disconnect UserId : ${senderId}`);
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