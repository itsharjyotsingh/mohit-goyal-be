import { Request, Response } from "express";
import HttpStatusCode from "../types/enums/http-status-codes";
import { PaymentsService } from "../service/PaymentsService";

export class PaymentsController {
    public static async createOrder(req: Request, res: Response): Promise<any> {
        try {
            const { customer_name, mobile, email, description, event_id } = req.body;

            if (
                !customer_name ||
                !mobile ||
                !email ||
                !event_id
            ) {
                return res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: "Missing required fields: price, customer_name, mobile, email, item_id, event_id",
                });
            }

            const result = await PaymentsService.createOrder({
                customer_name,
                mobile,
                email,
                description,
                event_id,
            });

            return res.status(HttpStatusCode.OK).json(result);
        } catch (error: any) {
            console.error(error);
            return res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Internal server error",
            });
        }
    }

    public static async verifyPayment(req: Request, res: Response): Promise<any> {
        try {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                return res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: "Missing razorpay verification fields",
                });
            }

            const result = await PaymentsService.verifyPayment({
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
            });

            return res.status(HttpStatusCode.OK).json({
                success: result.success,
                message: result.success ? "Payment verified" : "Payment verification failed",
            });
        } catch (error) {
            console.error(error);
            return res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Internal server error",
            });
        }
    }

    // public static async webhook(req: Request, res: Response): Promise<any> {
    //     try {
    //         const rawBody: string = (req as any).rawBody || JSON.stringify(req.body);
    //         const signature = req.headers["x-razorpay-signature"] as string | undefined;

    //         const result = await PaymentsService.handleWebhook(rawBody, signature, req.body);

    //         if (!result.ok) {
    //             return res.status(HttpStatusCode.BAD_REQUEST).send("Invalid signature");
    //         }
    //         return res.status(HttpStatusCode.OK).send("OK");
    //     } catch (error) {
    //         console.error(error);
    //         return res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).send("Server error");
    //     }
    // }
}
