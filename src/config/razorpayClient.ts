import Razorpay from "razorpay";

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Environment variable ${name} is not set.`);
    }
    return value;
}

const keyId = requireEnv("RAZORPAY_KEY_ID");
const keySecret = requireEnv("RAZORPAY_KEY_SECRET");

export const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
});

export const RAZORPAY_PUBLIC_KEY_ID = keyId;
