export interface IUser {
    id?: number
    name: string
    username: string
    email: string
    password?: string
    google_id?: string
    avatar?: string
    is_online?: boolean
    last_seen?: Date
    last_seen_privacy?: "everyone" | "contacts" | "nobody"
    avatar_privacy?: "everyone" | "contacts" | "nobody"
    read_receipts?: boolean
    search_discoverable?: boolean
    find_by_email_phone?: boolean
    public_key?: string
    encrypted_vault?: string
    vault_salt?: string
    two_factor_enabled?: boolean
    two_factor_secret?: string
    two_factor_iv?: string
    two_factor_tag?: string
    two_factor_recovery_codes?: string
    created_at?: Date
    updated_at?: Date
    deleted_at?: Date
}

export interface IJwtPayload {
    id: number;
    email: string;
    isPreAuth?: boolean;
}
