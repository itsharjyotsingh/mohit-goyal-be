import { razorpay } from "../config/razorpayClient";
import crypto from "crypto";
import { PaymentsRepository } from "../repository/PaymentsRepository";
import { EmailService } from "./EmailService";

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

    const amountPaise = Math.round(Number(event.price) * 100);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      throw new Error("Invalid event price");
    }

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

    // Ensure customer exists locally
    const customerId = await PaymentsRepository.findOrCreateCustomer(
      String(input.customer_name),
      String(input.email),
      String(input.mobile)
    );

    // Record attempted payment against the Razorpay order id
    await PaymentsRepository.insertAttempt(
      String(input.event_id),
      customerId,
      Number(order.amount),
      order.currency || "INR",
      String(input.description || ""),
      order.id
    );

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

    // Verify signature
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest("hex");
    const isValid = generatedSignature === razorpay_signature;

    if (!isValid) {
      // Mark the attempt as failed (optional but recommended)
      await PaymentsRepository.markFailedByOrderId(razorpay_order_id, razorpay_signature);
      return { success: false, message: "Payment verification failed" };
    }

    // Fetch order for notes (redundant but useful for logging/auditing)
    const order = await razorpay.orders.fetch(razorpay_order_id);
    const notes = order.notes || {};

    const customerName = notes.customer_name ?? "";
    const customerEmail = notes.email ?? "";
    const customerMobile = notes.mobile ?? "";
    const eventId = notes.event_id ?? "";
    const description = notes.description ?? "";

    if (!customerName || !customerEmail || !customerMobile || !eventId) {
      // You can choose to relax this if the attempted row is already present
      throw new Error("Missing required customer or event details in Razorpay order notes.");
    }

    // Get event details for email content
    const event = await PaymentsRepository.findEventById(eventId.toString());
    if (!event) {
      throw new Error("Event not found for email sending");
    }

    // Ensure customer exists (idempotent)
    await PaymentsRepository.findOrCreateCustomer(
      String(customerName),
      String(customerEmail),
      String(customerMobile)
    );

    // Mark as paid and store payment_id & signature
    await PaymentsRepository.updatePurchasePayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      "paid"
    );

    // Send confirmation email to customer
    try {
      await this.sendPaymentConfirmationEmail({
        customerName: String(customerName),
        customerEmail: String(customerEmail),
        eventDetails: event,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount: order.amount.toString(),
        description: String(description)
      });
    } catch (emailError) {
      // Log error but don't fail the payment verification
      console.error("Failed to send confirmation email:", emailError);
      // You might want to add this to a queue for retry later
    }

    return { success: true, message: "Payment verified and saved" };
  }

  /**
   * Send payment confirmation email to customer
   */
  private static async sendPaymentConfirmationEmail(params: {
    customerName: string;
    customerEmail: string;
    eventDetails: any; // Replace with your event type
    paymentId: string;
    orderId: string;
    amount: string;
    description: string;
  }) {
    const {
      customerName,
      customerEmail,
      eventDetails,
      paymentId,
      orderId,
      amount,
      description
    } = params;

    const emailData = {
      to: customerEmail,
      subject: `Payment Confirmation - ${eventDetails.name || 'Workshop Registration'}`,
      templateData: {
        customerName,
        eventName: eventDetails.title || 'Financial Workshop',
        eventDate: eventDetails.event_date ? new Date(eventDetails.event_date).toLocaleDateString() : 'TBD',
        eventTime: eventDetails.event_time || 'TBD',
        paymentId,
        orderId,
        amount: (Number(amount) / 100).toFixed(2), // Convert paise to rupees
        description,
        whatsappLink: process.env.WHATSAPP_GROUP_LINK || '#',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@themohitgoyal.com'
      }
    };

    await EmailService.sendPaymentConfirmation(emailData);
  }

  /**
   * Send email notification to admin about new payment
   */
  static async sendAdminNotification(params: {
    customerName: string;
    customerEmail: string;
    customerMobile: string;
    eventName: string;
    paymentId: string;
    amount: number;
  }) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@themohitgoyal.com';

    const emailData = {
      to: adminEmail,
      subject: `New Payment Received - ${params.eventName}`,
      templateData: {
        customerName: params.customerName,
        customerEmail: params.customerEmail,
        customerMobile: params.customerMobile,
        eventName: params.eventName,
        paymentId: params.paymentId,
        amount: (params.amount / 100).toFixed(2),
        timestamp: new Date().toLocaleString()
      }
    };

    await EmailService.sendAdminNotification(emailData);
  }
}
