import { CHAT_EVENTS } from "@/constants/socket.constants";
import User from "@/models/user.model";
import ConversationRepository from "@/repositories/conversation.repository";
import MessageRepository from "@/repositories/message.repository";
import jwtUtil from "@/utils/jwt.util";
import { Server as HttpServer } from "http";
import { Op } from "sequelize";
import { Server, Socket } from "socket.io";
import { GROUP_EVENTS } from "../../constants/socket.constants";
import GroupMemberRepository from "@/repositories/group-member.repository";
import GroupMessageRepository from "@/repositories/group-message.repository";

class SocketServer {
    private static instance: SocketServer;
    private io!: Server;

    private conversationRepo = new ConversationRepository()
    private groupMembersRepo = new GroupMemberRepository()
    private messageRepo = new MessageRepository()
    private groupMessageRepo = new GroupMessageRepository()

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

        this.io.on("connection", async (socket: Socket) => {

            const { id: senderId } = socket.data.user
            socket.join(`user_${senderId}`)
            console.log(`User connected UserId : ${senderId}`);

            const groupIds = await this.groupMembersRepo.findGroupIdsByUserId(senderId)

            const groupRooms = groupIds.map((id) => `group_${id}`)

            if (groupRooms.length) {
                socket.join(groupRooms)

                console.log([...socket.rooms])
            }

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
                        receiver_id: data.receiverId,
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

            socket.on(GROUP_EVENTS.SEND_MESSAGE, async (data: { groupId: number; content: string }) => {
                try {
                    const member = await this.groupMembersRepo.isMember(data.groupId, senderId)

                    if (!member) {
                        return socket.emit(GROUP_EVENTS.ERROR, {
                            message: "You are not member of this group"
                        })
                    }

                    const message = await this.groupMessageRepo.createMessage(data.groupId, senderId, data.content)

                    const { id, group_id, sender_id, content, type, created_at } = message.toJSON()

                    const payload = {
                        id,
                        group_id,
                        sender_id,
                        content,
                        type,
                        created_at,
                        sender: {
                            id: socket.data.user.id,
                            name: socket.data.user.name,
                            avatar: socket.data.user.avatar,
                        }
                    }

                    this.io.to(`group_${data.groupId}`).emit(GROUP_EVENTS.RECEIVE_MESSAGE, payload)
                } catch (error) {
                    console.error("[GROUP] send_message error:", error)
                    socket.emit(GROUP_EVENTS.ERROR, { message: "Failed to send message" })
                }
            })

            socket.on(GROUP_EVENTS.MARK_SEEN, async ({ groupId, messageIds }: { groupId: number; messageIds: number[] }) => {
                try {
                    await this.groupMessageRepo.markSeenBulk(messageIds, senderId)
                    await this.groupMembersRepo.updateLastReadAt(groupId, senderId)

                    this.io.to(`group_${groupId}`).emit(GROUP_EVENTS.SEEN_UPDATE, {
                        groupId,
                        userId: senderId,
                        messageIds,
                    })
                } catch (error) {
                    console.error("[GROUP] mark_seen error:", error)
                }
            })

            socket.on(GROUP_EVENTS.TYPING_START, ({ groupId }: { groupId: number }) => {
                socket.to(`group_${groupId}`).emit(GROUP_EVENTS.TYPING, {
                    groupId,
                    senderId,
                    senderName: socket.data.user.name,
                    isTyping: true,
                })
            })

            socket.on(GROUP_EVENTS.TYPING_STOP, ({ groupId }: { groupId: number }) => {
                socket.to(`group_${groupId}`).emit(GROUP_EVENTS.TYPING, {
                    groupId,
                    senderId,
                    senderName: socket.data.user.name,
                    isTyping: false,
                })
            })

            socket.on("disconnect", () => {
                console.log(`User disconnect UserId : ${senderId}`);
            });
        });
    }

    // ── notify group room from REST controllers ───────────────────────────

    public notifyMemberAdded(userId: number, groupId: number) {
        const userRoom = this.io.sockets.adapter.rooms.get(`user_${userId}`)

        // 1. join the room first
        if (userRoom) {
            for (const socketId of userRoom) {
                const s = this.io.sockets.sockets.get(socketId)
                s?.join(`group_${groupId}`)
            }
        }

        // 2. now emit to group room — added user is now in the room and will receive it
        this.io.to(`group_${groupId}`).emit(GROUP_EVENTS.MEMBER_JOINED, { groupId })

        // 3. also emit to added user's personal room in case they're not in GroupChat
        this.io.to(`user_${userId}`).emit(GROUP_EVENTS.MEMBER_JOINED, { groupId })
    }

    public notifyMemberLeft(groupId: number, userId: number) {
        const userRoom = this.io.sockets.adapter.rooms.get(`user_${userId}`)
        if (!userRoom) return

        for (const socketId of userRoom) {
            const s = this.io.sockets.sockets.get(socketId)
            s?.leave(`group_${groupId}`)
        }

        this.io.to(`group_${groupId}`).emit(GROUP_EVENTS.MEMBER_LEFT, { groupId, userId })
    }

    public notifyGroupMessage(groupId: number, message: {
        id: number
        group_id: number
        sender_id: null | number
        content: string
        type: string
        created_at: string | Date
    }) {
        this.io.to(`group_${groupId}`).emit(GROUP_EVENTS.RECEIVE_MESSAGE, message)
    }

    public getIO(): Server {
        if (!this.io) {
            throw new Error("Socket not initialized");
        }
        return this.io;
    }
}

export default SocketServer;