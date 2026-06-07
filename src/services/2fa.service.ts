import { TWO_FACTOR_APP_NAME } from "@/config";
import { IVerifyTwoFactorPayload } from "@/types/general/crypto.interface";
import { dcrypt, encrypt } from "@/utils/encrypt";
import { generateSecret, generateURI, verify } from "otplib"
import QRCode from "qrcode"

class TwoFactorService {

    /**
     * Generate 2FA secret + QR Code
     */
    public async generateTwoFactorSecret(email: string) {

        //generate base32 secret
        const secret = generateSecret();

        //generate authenticator app URL
        const uri = generateURI(
            {
                issuer: TWO_FACTOR_APP_NAME,
                label: email,
                secret
            }
        )

        //Convert URI into qrcode
        const qrcode = await QRCode.toDataURL(uri);

        // Encrypt secret before storing
        const encryptedSecret = encrypt(secret);


        return {
            qrcode,
            uri,
            secret: encryptedSecret
        }
    }

    /**
     * Verify OTP
     */
    public async verifyTwofactorCode(
        data: IVerifyTwoFactorPayload
    ): Promise<boolean> {
        const { encryptedSecret, code } = data;

        // otplib.verify throws error if token contains non-digits
        if (!/^\d+$/.test(code)) {
            return false;
        }

        // Decrypt DB secret
        const secret = dcrypt(encryptedSecret);

        // Verify OTP
        const result = await verify({
            secret,
            token: code
        });

        return result.valid;
    }
}

export default TwoFactorService