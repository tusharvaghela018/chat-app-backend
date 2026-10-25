import { CHAT_EVENTS, CALL_EVENTS } from "@/constants/socket.constants";
import User from "@/models/user.model";
import Conversation from "@/models/conversations.model";
import ConversationRepository from "@/repositories/conversation.repository";
import MessageRepository from "@/repositories/message.repository";
import jwtUtil from "@/utils/jwt.util";
import { decryptToken } from "@/utils/encrypt";
import { Server as HttpServer } from "http";
import { Op } from "sequelize";
import { Server, Socket } from "socket.io";
import { GROUP_EVENTS } from "../../constants/socket.constants";
import GroupMemberRepository from "@/repositories/group-member.repository";
import GroupMessageRepository from "@/repositories/group-message.repository";
import starredMessageRepository from "@/repositories/starred-message.repository";
import callRepository, { CallRepository } from "@/repositories/call.repository";

interface ActiveCallSession {
    peerId: number;
    callRecordId: number;
    startedAt: Date;
    acceptedAt?: Date;
    isVideo: boolean;
    callerId: number;
    receiverId: number;
    conversationId?: number;
}

class SocketServer {
    private static instance: SocketServer;
    private io!: Server;

    private conversationRepo = new ConversationRepository()
    private groupMembersRepo = new GroupMemberRepository()
    private messageRepo = new MessageRepository()
    private groupMessageRepo = new GroupMessageRepository()
    private callRepo: CallRepository = callRepository
    private connectedUsers: Map<number, Set<string>> = new Map()
    private userPrivacyMap: Map<number, { last_seen_privacy?: string; read_receipts?: boolean; avatar_privacy?: string }> = new Map()
    private activeCalls: Map<number, ActiveCallSession> = new Map()

    private constructor() { }

    public static getInstance(): SocketServer {
        if (!SocketServer.instance) {
            SocketServer.instance = new SocketServer();
        }
        return SocketServer.instance;
    }

    public initialize(server: HttpServer) {
        // Reset any stale is_online flags on startup
        User.update({ is_online: false }, { where: { is_online: true } }).catch(err => {
            console.error("Failed to reset is_online on startup", err);
        });

        this.io = new Server(server, {
            cors: {
                origin: true,
                credentials: true,
            },
        });

        this.io.use(async (socket, next) => {
            try {
                let token: string | null = (socket.handshake.auth?.token as string) || (socket.handshake.query?.token as string) || null;

                // If not provided in handshake auth, extract and decrypt token from cookie
                if (!token && socket.handshake.headers.cookie) {
                    const cookieHeader = socket.handshake.headers.cookie;
                    const cookies = cookieHeader.split(";").reduce((acc: Record<string, string>, curr) => {
                        const [key, ...vals] = curr.trim().split("=");
                        if (key && vals.length) acc[key] = decodeURIComponent(vals.join("="));
                        return acc;
                    }, {});

                    const rawCookie = cookies.auth_token || cookies.token;
                    if (rawCookie) {
                        token = decryptToken(rawCookie) || rawCookie;
                    }
                }

                if (!token) {
                    return next(new Error("No Token provided"))
                }

                const payLoad = jwtUtil.verify(token)
                const user = await User.findByPk(payLoad.id)
                if (!user) return next(new Error("User Not Found"))

                const plainUser = user.toJSON()
                delete plainUser.password

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

            // Track active socket connection for real-time online/offline status
            const userSockets = this.connectedUsers.get(senderId) || new Set<string>();
            const wasOffline = userSockets.size === 0;
            userSockets.add(socket.id);
            this.connectedUsers.set(senderId, userSockets);

            this.userPrivacyMap.set(senderId, {
                last_seen_privacy: socket.data.user?.last_seen_privacy || 'everyone',
                read_receipts: socket.data.user?.read_receipts !== false,
                avatar_privacy: socket.data.user?.avatar_privacy || 'everyone'
            });

            const currentPrivacy = this.userPrivacyMap.get(senderId)?.last_seen_privacy;

            if (wasOffline) {
                User.update({ is_online: true }, { where: { id: senderId } }).catch(err => {
                    console.error("Failed to update user is_online=true", err);
                });
                if (currentPrivacy !== 'nobody') {
                    this.io.emit(CHAT_EVENTS.USER_STATUS, {
                        userId: senderId,
                        isOnline: true,
                        lastSeen: null,
                    });
                }
            }

            // Emit current list of online user IDs to the connected client (filter out users with last_seen_privacy === 'nobody')
            const visibleOnlineIds = Array.from(this.connectedUsers.keys()).filter((uid) => {
                return this.userPrivacyMap.get(uid)?.last_seen_privacy !== 'nobody';
            });
            socket.emit(CHAT_EVENTS.ONLINE_USERS, visibleOnlineIds);

            const groupIds = await this.groupMembersRepo.findGroupIdsByUserId(senderId)

            const groupRooms = groupIds.map((id) => `group_${id}`)

            if (groupRooms.length) {
                socket.join(groupRooms)

                console.log([...socket.rooms])
            }

            socket.on(CHAT_EVENTS.SEND_MESSAGE, async (data: { receiverId: number, content: string }) => {
                try {
                    const conversation = await this.conversationRepo.getConversation({ senderId: senderId, receiverId: data.receiverId })

                    // Check if rejected - prevent sender from messaging again
                    if (conversation.status === 'rejected') {
                        return socket.emit(CHAT_EVENTS.ERROR, { message: "You cannot send messages to this user." })
                    }

                    // Determine if the message should be hidden for either party
                    const isSenderInConv = conversation.sender_id === senderId
                    const isReceiverInConv = conversation.receiver_id === senderId

                    const otherUserBlockedMe = isSenderInConv ? conversation.blocked_by_receiver : conversation.blocked_by_sender
                    const iBlockedOtherUser = isSenderInConv ? conversation.blocked_by_sender : conversation.blocked_by_receiver

                    // If OTHER user has blocked ME, the message is hidden for THEM
                    const isHiddenForOther = otherUserBlockedMe
                    // If I have blocked OTHER user, the message is hidden for ME (though I'm sending it)
                    // Actually, if I block someone and I send them a message, I should probably still see my own message.
                    // But the requirement says "user A blocked user B ... that periods time user A will not seen tat messages".
                    // This usually refers to messages RECEIVED while having someone blocked.
                    
                    const message = await this.messageRepo.create({
                        conversation_id: conversation.id,
                        sender_id: senderId,
                        content: data.content,
                        is_hidden_for_sender_id: isSenderInConv ? false : isHiddenForOther,
                        is_hidden_for_receiver_id: isReceiverInConv ? false : isHiddenForOther
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

                    // Only emit to receiver if they haven't blocked the sender
                    if (!otherUserBlockedMe) {
                        if (conversation.status === 'accepted') {
                            this.io.to(`user_${data.receiverId}`).emit(CHAT_EVENTS.RECEIVE_MESSAGE, payload)
                        } else if (conversation.status === 'pending') {
                            this.io.to(`user_${data.receiverId}`).emit(CHAT_EVENTS.NEW_REQUEST, {
                                conversationId: conversation.id,
                                senderId: senderId,
                            })
                        }
                    }

                    // Always emit back to sender so they see their own message
                    socket.emit(CHAT_EVENTS.RECEIVE_MESSAGE, payload)

                } catch (error) {
                    console.log(error);
                }
            })

            socket.on(CHAT_EVENTS.MARK_SEEN, async ({ conversationId, senderId: sender_id }) => {
                const user = socket.data.user;

                // Respect read receipts setting
                if (user?.read_receipts === false) return;

                // Check block status before marking as seen
                const conversation = await this.conversationRepo.findById(conversationId)
                if (!conversation) return

                // Do not mark as seen if the request is still pending
                if (conversation.status === 'pending') return

                const isSender = conversation.sender_id === user.id
                const iBlockedOther = isSender ? conversation.blocked_by_sender : conversation.blocked_by_receiver
                const otherBlockedMe = isSender ? conversation.blocked_by_receiver : conversation.blocked_by_sender

                if (iBlockedOther || otherBlockedMe) return

                const filterField = isSender ? 'is_hidden_for_sender_id' : 'is_hidden_for_receiver_id'

                const [_, updatedMessages] = await this.messageRepo.update(
                    { is_seen: true },
                    {
                        where: {
                            conversation_id: conversationId,
                            sender_id: { [Op.ne]: user.id }, // not current user
                            [filterField]: false
                        },
                        returning: true
                    }
                ) as unknown as [number, any[]];

                const updatedIds = updatedMessages.map(m => m.id);

                if (updatedIds.length === 0) return;

                // notify sender only if not blocked
                this.io.to(`user_${sender_id}`).emit(CHAT_EVENTS.MESSAGES_SEEN, {
                    conversationId,
                    messageIds: updatedIds
                });
            });


            socket.on(CHAT_EVENTS.TYPING_START, async (data: { receiverId: number }) => {
                const conversation = await this.conversationRepo.getConversation({ senderId, receiverId: data.receiverId })
                const isSender = conversation.sender_id === senderId
                const otherBlockedMe = isSender ? conversation.blocked_by_receiver : conversation.blocked_by_sender
                
                if (!otherBlockedMe) {
                    this.io.to(`user_${data.receiverId}`).emit(CHAT_EVENTS.TYPING, {
                        senderId,
                        isTyping: true
                    })
                }
            })

            socket.on(CHAT_EVENTS.TYPING_STOP, async (data: { receiverId: number }) => {
                const conversation = await this.conversationRepo.getConversation({ senderId, receiverId: data.receiverId })
                const isSender = conversation.sender_id === senderId
                const otherBlockedMe = isSender ? conversation.blocked_by_receiver : conversation.blocked_by_sender

                if (!otherBlockedMe) {
                    this.io.to(`user_${data.receiverId}`).emit(CHAT_EVENTS.TYPING, {
                        senderId,
                        isTyping: false
                    })
                }
            })

            socket.on(CHAT_EVENTS.TOGGLE_REACTION, async (data: { messageId: number; emoji: string; receiverId: number }) => {
                try {
                    const reactions = await this.messageRepo.toggleReaction(data.messageId, senderId, data.emoji)
                    const payload = {
                        messageId: data.messageId,
                        reactions: reactions.map(r => r.toJSON()),
                    }
                    this.io.to(`user_${senderId}`).emit(CHAT_EVENTS.REACTION_UPDATED, payload)
                    this.io.to(`user_${data.receiverId}`).emit(CHAT_EVENTS.REACTION_UPDATED, payload)
                } catch (err) {
                    console.error("Failed to toggle reaction", err)
                }
            })

            socket.on(GROUP_EVENTS.TOGGLE_REACTION, async (data: { groupMessageId: number; groupId: number; emoji: string }) => {
                try {
                    const isMember = await this.groupMembersRepo.isMember(data.groupId, senderId)
                    if (!isMember) return

                    const reactions = await this.groupMessageRepo.toggleReaction(data.groupMessageId, senderId, data.emoji)
                    const payload = {
                        groupMessageId: data.groupMessageId,
                        groupId: data.groupId,
                        reactions: reactions.map(r => r.toJSON()),
                    }
                    this.io.to(`group_${data.groupId}`).emit(GROUP_EVENTS.REACTION_UPDATED, payload)
                } catch (err) {
                    console.error("Failed to toggle group reaction", err)
                }
            })

            socket.on(GROUP_EVENTS.SEND_MESSAGE, async (data: { groupId: number; content: string; encrypted_keys?: any }) => {
                try {
                    const member = await this.groupMembersRepo.isMember(data.groupId, senderId)

                    if (!member) {
                        return socket.emit(GROUP_EVENTS.ERROR, {
                            message: "You are not member of this group"
                        })
                    }

                    const message = await this.groupMessageRepo.createMessage(data.groupId, senderId, data.content, data.encrypted_keys)

                    const { id, group_id, sender_id, content, type, encrypted_keys, created_at } = message.toJSON()

                    const payload = {
                        id,
                        group_id,
                        sender_id,
                        content,
                        type,
                        encrypted_keys,
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

            // ── WebRTC 1-on-1 Calling ───────────────────────────────────────────
            socket.on(CALL_EVENTS.INITIATE, async (data: { recipientId: number; isVideo: boolean; conversationId?: number; callerInfo?: any }) => {
                try {
                    const recipientId = Number(data.recipientId);
                    const targetSockets = this.connectedUsers.get(recipientId);

                    if (!targetSockets || targetSockets.size === 0) {
                        const now = new Date();
                        const callRecord = await this.callRepo.create({
                            caller_id: senderId,
                            receiver_id: recipientId,
                            conversation_id: data.conversationId || null,
                            type: data.isVideo ? "video" : "audio",
                            status: "missed",
                            duration: 0,
                            started_at: now,
                            ended_at: now,
                        });

                        await this.createCallLogMessage({
                            callerId: senderId,
                            receiverId: recipientId,
                            conversationId: data.conversationId,
                            callRecordId: callRecord.id,
                            isVideo: !!data.isVideo,
                            status: "missed",
                            duration: 0,
                            startedAt: now,
                        });

                        return socket.emit(CALL_EVENTS.UNAVAILABLE, { reason: "offline" });
                    }

                    if (this.activeCalls.has(recipientId)) {
                        const now = new Date();
                        const callRecord = await this.callRepo.create({
                            caller_id: senderId,
                            receiver_id: recipientId,
                            conversation_id: data.conversationId || null,
                            type: data.isVideo ? "video" : "audio",
                            status: "busy",
                            duration: 0,
                            started_at: now,
                            ended_at: now,
                        });

                        await this.createCallLogMessage({
                            callerId: senderId,
                            receiverId: recipientId,
                            conversationId: data.conversationId,
                            callRecordId: callRecord.id,
                            isVideo: !!data.isVideo,
                            status: "busy",
                            duration: 0,
                            startedAt: now,
                        });

                        return socket.emit(CALL_EVENTS.UNAVAILABLE, { reason: "busy" });
                    }

                    if (this.activeCalls.has(senderId)) {
                        return socket.emit(CALL_EVENTS.UNAVAILABLE, { reason: "already_in_call" });
                    }

                    // Check if either user blocked the other
                    if (data.conversationId) {
                        const conversation = await this.conversationRepo.findById(data.conversationId);
                        if (conversation) {
                            if (conversation.blocked_by_sender || conversation.blocked_by_receiver) {
                                return socket.emit(CALL_EVENTS.UNAVAILABLE, { reason: "blocked" });
                            }
                        }
                    }

                    // Persist initial call log as missed until answered
                    const now = new Date();
                    const callRecord = await this.callRepo.create({
                        caller_id: senderId,
                        receiver_id: recipientId,
                        conversation_id: data.conversationId || null,
                        type: data.isVideo ? "video" : "audio",
                        status: "missed",
                        duration: 0,
                        started_at: now,
                    });

                    this.activeCalls.set(senderId, {
                        peerId: recipientId,
                        callRecordId: callRecord.id,
                        startedAt: now,
                        isVideo: !!data.isVideo,
                        callerId: senderId,
                        receiverId: recipientId,
                        conversationId: data.conversationId,
                    });

                    this.io.to(`user_${recipientId}`).emit(CALL_EVENTS.INCOMING, {
                        callRecordId: callRecord.id,
                        callerId: senderId,
                        isVideo: !!data.isVideo,
                        conversationId: data.conversationId,
                        callerInfo: data.callerInfo || {
                            id: socket.data.user.id,
                            name: socket.data.user.name,
                            avatar: socket.data.user.avatar,
                            username: socket.data.user.username,
                        }
                    });
                } catch (error) {
                    console.error("Error in CALL_EVENTS.INITIATE:", error);
                    socket.emit(CALL_EVENTS.UNAVAILABLE, { reason: "error" });
                }
            });

            socket.on(CALL_EVENTS.ACCEPT, async (data: { callerId: number }) => {
                const callerId = Number(data.callerId);
                const callerSession = this.activeCalls.get(callerId);

                if (callerSession) {
                    const acceptedAt = new Date();
                    callerSession.acceptedAt = acceptedAt;

                    this.activeCalls.set(senderId, {
                        peerId: callerId,
                        callRecordId: callerSession.callRecordId,
                        startedAt: callerSession.startedAt,
                        acceptedAt,
                        isVideo: callerSession.isVideo,
                        callerId: callerSession.callerId,
                        receiverId: callerSession.receiverId,
                        conversationId: callerSession.conversationId,
                    });

                    await this.callRepo.update(callerSession.callRecordId, {
                        status: "completed",
                    });
                }

                this.io.to(`user_${callerId}`).emit(CALL_EVENTS.ACCEPTED, { recipientId: senderId });
            });

            socket.on(CALL_EVENTS.REJECT, async (data: { callerId: number; reason?: string }) => {
                const callerId = Number(data.callerId);
                const callerSession = this.activeCalls.get(callerId);

                if (callerSession) {
                    const finalStatus = data.reason === "busy" ? "busy" : "declined";
                    await this.callRepo.update(callerSession.callRecordId, {
                        status: finalStatus,
                        ended_at: new Date(),
                    });

                    await this.createCallLogMessage({
                        callerId: callerSession.callerId,
                        receiverId: callerSession.receiverId,
                        conversationId: callerSession.conversationId,
                        callRecordId: callerSession.callRecordId,
                        isVideo: callerSession.isVideo,
                        status: finalStatus,
                        duration: 0,
                        startedAt: callerSession.startedAt,
                    });

                    this.activeCalls.delete(callerId);
                    this.activeCalls.delete(senderId);
                }

                this.io.to(`user_${callerId}`).emit(CALL_EVENTS.REJECTED, {
                    responderId: senderId,
                    reason: data.reason || "declined"
                });
            });

            socket.on(CALL_EVENTS.END, async (data: { targetUserId?: number; reason?: string }) => {
                let session = this.activeCalls.get(senderId);
                const targetId = session?.peerId || Number(data?.targetUserId);
                if (!session && targetId) {
                    session = this.activeCalls.get(targetId);
                }

                if (session) {
                    const endedAt = new Date();
                    const durationSecs = session.acceptedAt
                        ? Math.max(0, Math.round((endedAt.getTime() - session.acceptedAt.getTime()) / 1000))
                        : 0;

                    const isAnswered = !!session.acceptedAt;
                    const finalStatus: "completed" | "missed" | "cancelled" = isAnswered
                        ? "completed"
                        : senderId === session.callerId
                        ? "cancelled"
                        : "missed";

                    await this.callRepo.update(session.callRecordId, {
                        ended_at: endedAt,
                        duration: durationSecs,
                        status: isAnswered ? "completed" : "missed",
                    });

                    await this.createCallLogMessage({
                        callerId: session.callerId,
                        receiverId: session.receiverId,
                        conversationId: session.conversationId,
                        callRecordId: session.callRecordId,
                        isVideo: session.isVideo,
                        status: finalStatus,
                        duration: durationSecs,
                        startedAt: session.startedAt,
                    });

                    this.activeCalls.delete(session.peerId);
                    this.activeCalls.delete(senderId);
                    if (session.callerId) this.activeCalls.delete(session.callerId);
                    if (session.receiverId) this.activeCalls.delete(session.receiverId);
                }

                if (targetId) {
                    this.io.to(`user_${targetId}`).emit(CALL_EVENTS.ENDED, {
                        userId: senderId,
                        reason: data?.reason || "ended"
                    });
                }
            });

            socket.on(CALL_EVENTS.OFFER, (data: { targetUserId: number; sdp: any }) => {
                this.io.to(`user_${Number(data.targetUserId)}`).emit(CALL_EVENTS.OFFER, {
                    callerId: senderId,
                    sdp: data.sdp
                });
            });

            socket.on(CALL_EVENTS.ANSWER, (data: { targetUserId: number; sdp: any }) => {
                this.io.to(`user_${Number(data.targetUserId)}`).emit(CALL_EVENTS.ANSWER, {
                    responderId: senderId,
                    sdp: data.sdp
                });
            });

            socket.on(CALL_EVENTS.ICE_CANDIDATE, (data: { targetUserId: number; candidate: any }) => {
                this.io.to(`user_${Number(data.targetUserId)}`).emit(CALL_EVENTS.ICE_CANDIDATE, {
                    senderId,
                    candidate: data.candidate
                });
            });

            socket.on(CALL_EVENTS.TOGGLE_MEDIA, (data: { targetUserId: number; isMuted?: boolean; isVideoOff?: boolean }) => {
                this.io.to(`user_${Number(data.targetUserId)}`).emit(CALL_EVENTS.MEDIA_TOGGLED, {
                    senderId,
                    isMuted: data.isMuted,
                    isVideoOff: data.isVideoOff
                });
            });

            socket.on("disconnect", async () => {
                console.log(`User disconnect UserId : ${senderId}`);

                // Clean up active call on disconnect
                if (this.activeCalls.has(senderId)) {
                    const session = this.activeCalls.get(senderId);
                    if (session) {
                        const endedAt = new Date();
                        const durationSecs = session.acceptedAt
                            ? Math.max(0, Math.round((endedAt.getTime() - session.acceptedAt.getTime()) / 1000))
                            : 0;

                        const isAnswered = !!session.acceptedAt;
                        const finalStatus: "completed" | "missed" | "cancelled" = isAnswered
                            ? "completed"
                            : senderId === session.callerId
                            ? "cancelled"
                            : "missed";

                        await this.callRepo.update(session.callRecordId, {
                            ended_at: endedAt,
                            duration: durationSecs,
                            status: isAnswered ? "completed" : "missed",
                        });

                        await this.createCallLogMessage({
                            callerId: session.callerId,
                            receiverId: session.receiverId,
                            conversationId: session.conversationId,
                            callRecordId: session.callRecordId,
                            isVideo: session.isVideo,
                            status: finalStatus,
                            duration: durationSecs,
                            startedAt: session.startedAt,
                        });

                        this.io.to(`user_${session.peerId}`).emit(CALL_EVENTS.ENDED, {
                            userId: senderId,
                            reason: "disconnected"
                        });
                        this.activeCalls.delete(session.peerId);
                        if (session.callerId) this.activeCalls.delete(session.callerId);
                        if (session.receiverId) this.activeCalls.delete(session.receiverId);
                    }
                    this.activeCalls.delete(senderId);
                }

                const userSockets = this.connectedUsers.get(senderId);
                if (userSockets) {
                    userSockets.delete(socket.id);
                    if (userSockets.size === 0) {
                        this.connectedUsers.delete(senderId);
                        const now = new Date();
                        User.update({ is_online: false, last_seen: now }, { where: { id: senderId } }).catch(err => {
                            console.error("Failed to update user is_online=false", err);
                        });
                        const privacy = this.userPrivacyMap.get(senderId)?.last_seen_privacy;
                        if (privacy !== 'nobody') {
                            this.io.emit(CHAT_EVENTS.USER_STATUS, {
                                userId: senderId,
                                isOnline: false,
                                lastSeen: now.toISOString(),
                            });
                        } else {
                            this.io.emit(CHAT_EVENTS.USER_STATUS, {
                                userId: senderId,
                                isOnline: false,
                                lastSeen: null,
                            });
                        }
                    }
                }
            });
        });
    }

    public updateUserPrivacy(userId: number, settings: { last_seen_privacy?: string; read_receipts?: boolean; avatar_privacy?: string }) {
        const current = this.userPrivacyMap.get(userId) || {};
        const updated = { ...current, ...settings };
        this.userPrivacyMap.set(userId, updated);

        // Update all active sockets for this user
        const userSocketIds = this.connectedUsers.get(userId);
        if (userSocketIds) {
            for (const socketId of userSocketIds) {
                const s = this.io?.sockets?.sockets?.get(socketId);
                if (s && s.data.user) {
                    if (settings.last_seen_privacy) s.data.user.last_seen_privacy = settings.last_seen_privacy;
                    if (settings.read_receipts !== undefined) s.data.user.read_receipts = settings.read_receipts;
                    if (settings.avatar_privacy) s.data.user.avatar_privacy = settings.avatar_privacy;
                }
            }
        }

        // Broadcast status changes
        if (settings.last_seen_privacy === 'nobody') {
            this.io?.emit(CHAT_EVENTS.USER_STATUS, {
                userId,
                isOnline: false,
                lastSeen: null,
            });
        } else if (settings.last_seen_privacy && userSocketIds && userSocketIds.size > 0) {
            this.io?.emit(CHAT_EVENTS.USER_STATUS, {
                userId,
                isOnline: true,
                lastSeen: null,
            });
        }
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

    public notifyConversationStatusUpdated(
        conversationId: number,
        senderId: number,
        receiverId: number,
        status: string
    ) {
        if (!this.io) return;
        const payload = { conversationId, senderId, receiverId, status };
        this.io.to(`user_${senderId}`).emit(CHAT_EVENTS.CONVERSATION_STATUS_UPDATED, payload);
        this.io.to(`user_${receiverId}`).emit(CHAT_EVENTS.CONVERSATION_STATUS_UPDATED, payload);
    }

    public notifyConversationArchived(
        userId: number,
        conversationId: number,
        archived: boolean
    ) {
        if (!this.io) return;
        this.io.to(`user_${userId}`).emit(CHAT_EVENTS.CONVERSATION_STATUS_UPDATED, {
            conversationId,
            archived,
        });
    }

    public notifyStarUpdated(userId: number, data: { messageId?: number; groupMessageId?: number; isStarred: boolean; groupId?: number }) {
        if (!this.io) return;
        if (data.messageId) {
            this.io.to(`user_${userId}`).emit(CHAT_EVENTS.STAR_UPDATED, {
                messageId: data.messageId,
                isStarred: data.isStarred,
                userId,
            });
        }
        if (data.groupMessageId) {
            this.io.to(`user_${userId}`).emit(GROUP_EVENTS.STAR_UPDATED, {
                groupMessageId: data.groupMessageId,
                isStarred: data.isStarred,
                userId,
                groupId: data.groupId,
            });
        }
    }

    private async createCallLogMessage(params: {
        callerId: number;
        receiverId: number;
        conversationId?: number;
        callRecordId: number;
        isVideo: boolean;
        status: "completed" | "missed" | "declined" | "busy" | "cancelled";
        duration: number;
        startedAt: Date;
    }) {
        try {
            let conversationId = params.conversationId;
            if (!conversationId) {
                const conv = await this.conversationRepo.getConversation({
                    senderId: params.callerId,
                    receiverId: params.receiverId,
                });
                conversationId = conv.id;
            }

            const callPayload = {
                type: "call_log",
                callId: params.callRecordId,
                callType: params.isVideo ? "video" : "audio",
                status: params.status,
                duration: params.duration,
                startedAt: params.startedAt,
            };

            const message = await this.messageRepo.create({
                conversation_id: conversationId,
                sender_id: params.callerId,
                content: JSON.stringify(callPayload),
                is_hidden_for_sender_id: false,
                is_hidden_for_receiver_id: false,
            });

            // Touch conversation updated_at so it bumps to top in conversation lists
            await Conversation.update(
                { updated_at: new Date() },
                { where: { id: conversationId } }
            ).catch(() => {});

            const { id, content, sender_id, created_at } = message.toJSON();
            const payload = {
                id,
                content,
                sender_id,
                receiver_id: params.receiverId,
                conversation_id: conversationId,
                created_at,
            };

            this.io.to(`user_${params.receiverId}`).emit(CHAT_EVENTS.RECEIVE_MESSAGE, payload);
            this.io.to(`user_${params.callerId}`).emit(CHAT_EVENTS.RECEIVE_MESSAGE, payload);
        } catch (err) {
            console.error("Failed to create call log in chat:", err);
        }
    }

    public getIO(): Server {
        if (!this.io) {
            throw new Error("Socket not initialized");
        }
        return this.io;
    }
}

export default SocketServer;