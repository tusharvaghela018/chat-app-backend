export type CallType = "audio" | "video";
export type CallStatus = "completed" | "missed" | "declined" | "busy" | "cancelled";

export interface ICall {
    id?: number;
    caller_id: number;
    receiver_id: number;
    conversation_id?: number | null;
    type: CallType;
    status: CallStatus;
    duration: number;
    started_at: Date;
    ended_at?: Date | null;
    created_at?: Date;
    updated_at?: Date;
}
