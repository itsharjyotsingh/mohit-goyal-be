import { razorpay } from "../config/razorpayClient";
import crypto from "crypto";
import { PaymentsRepository } from "../repository/PaymentsRepository";

export interface CreateOrderInput {
    customer_name: string;
    mobile: string;
    email: string;
    description: string;
    event_id: string;
}

export class PaymentsService {
    static async createOrder(input: CreateOrderInput) {
        const event = await PaymentsRepository.findEventById(input.event_id);

        if (!event) {
            throw new Error("Event not found");
        }

        const amountPaise = event.price * 100;

        const receipt = `evt_${input.event_id.split("-")[0]}_${Date.now()}`;

        const order = await razorpay.orders.create({
            amount: amountPaise,
            currency: "INR",
            receipt,
            notes: {
                event_id: input.event_id,
                customer_name: input.customer_name,
                email: input.email,
                mobile: input.mobile,
                description: input.description,
            },
        });

        return {
            success: true,
            data: {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId: process.env.RAZORPAY_KEY_ID,
                prefill: {
                    name: input.customer_name,
                    email: input.email,
                    contact: input.mobile,
                },
            },
        };
    }

    static async verifyPayment(params: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
    }) {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = params;

        const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!);
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generatedSignature = hmac.digest("hex");
        const isValid = generatedSignature === razorpay_signature;

        if (!isValid) {
            return { success: false, message: "Payment verification failed" };
        }

        const order = await razorpay.orders.fetch(razorpay_order_id);
        const notes = order.notes || {};

        const customerName = notes.customer_name ?? "";
        const customerEmail = notes.email ?? "";
        const customerMobile = notes.mobile ?? "";
        const eventId = notes.event_id ?? "";
        const description = notes.description ?? "";

        if (!customerName || !customerEmail || !customerMobile || !eventId) {
            throw new Error("Missing required customer or event details in Razorpay order notes.");
        }

        const customerId = await PaymentsRepository.findOrCreateCustomer(
            String(customerName),
            String(customerEmail),
            String(customerMobile)
        );

        await PaymentsRepository.insertPurchase(
            String(eventId),
            customerId,
            Number(order.amount) ?? 0,
            order.currency || "INR",
            String(description),
            "paid",
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );

        return { success: true, message: "Payment verified and saved" };
    }
}
