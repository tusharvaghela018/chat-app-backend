export interface DcryptPayload {
    encrypted: string,
    iv: string,
    tag: string
}

export interface IVerifyTwoFactorPayload {
    encryptedSecret: DcryptPayload,
    code: string
}