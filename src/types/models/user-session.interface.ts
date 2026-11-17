export interface IUserSession {
    id?: string;
    user_id: number;
    device_type: string;
    device_name: string;
    browser: string;
    os: string;
    ip_address: string;
    location?: string;
    city?: string;
    region?: string;
    country?: string;
    country_code?: string;
    is_revoked?: boolean;
    last_active_at?: Date;
    created_at?: Date;
    updated_at?: Date;
}
