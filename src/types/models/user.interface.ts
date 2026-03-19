export interface IUser {
    id?: number
    name: string
    email: string
    password?: string
    google_id?: string
    avatar?: string
    is_online?: boolean
    created_at?: Date
    updated_at?: Date
    deleted_at?: Date
}

export interface IJwtPayload {
    id: number;
    email: string;
}