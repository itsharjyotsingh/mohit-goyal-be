// services/EmailService.ts
import nodemailer from 'nodemailer';

interface EmailData {
    to: string;
    subject: string;
    templateData: any;
}

export class EmailService {
    private static transporter = nodemailer.createTransport({
        service: 'gmail', // or your preferred email service
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD // Use App Password for Gmail
        }
    });

    /**
     * Send payment confirmation email to customer
     */
    static async sendPaymentConfirmation(emailData: EmailData): Promise<void> {
        const { to, subject, templateData } = emailData;

        const htmlContent = this.generatePaymentConfirmationHTML(templateData);

        const mailOptions = {
            from: `"CA Mohit Goyal" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html: htmlContent
        };

        await this.transporter.sendMail(mailOptions);
    }

    /**
     * Send admin notification email
     */
    static async sendAdminNotification(emailData: EmailData): Promise<void> {
        const { to, subject, templateData } = emailData;

        const htmlContent = this.generateAdminNotificationHTML(templateData);

        const mailOptions = {
            from: `"Payment System" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html: htmlContent
        };

        await this.transporter.sendMail(mailOptions);
    }

    /**
     * Generate HTML template for payment confirmation
     */
    private static generatePaymentConfirmationHTML(data: any): string {
        return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .success-badge { background: #10b981; color: white; padding: 10px 20px; border-radius: 25px; display: inline-block; margin: 20px 0; }
        .details-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }
        .cta-button { background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Payment Successful!</h1>
          <div class="success-badge">Registration Confirmed</div>
        </div>
        
        <div class="content">
          <h2>Hello ${data.customerName}!</h2>
          <p>Thank you for registering for our workshop. Your payment has been successfully processed.</p>
          
          <div class="details-box">
            <h3>Workshop Details:</h3>
            <p><strong>Event:</strong> ${data.eventName}</p>
            <p><strong>Date:</strong> ${data.eventDate}</p>
            <p><strong>Time:</strong> ${data.eventTime}</p>
            <p><strong>Amount Paid:</strong> ₹${data.amount}</p>
            <p><strong>Payment ID:</strong> ${data.paymentId}</p>
            <p><strong>Order ID:</strong> ${data.orderId}</p>
          </div>
          
          <h3>What's Next?</h3>
          <ul>
            <li>Join our WhatsApp group for updates and resources</li>
            <li>You'll receive workshop materials 24 hours before the event</li>
            <li>Check your email regularly for important updates</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="${data.whatsappLink}" class="cta-button">📱 Join WhatsApp Group</a>
          </div>
          
          <p><strong>Need Help?</strong><br>
          Contact us at: ${data.supportEmail}</p>
          
          <div class="footer">
            <p>Best regards,<br><strong>CA Mohit Goyal Team</strong></p>
            <p>This is an automated confirmation email. Please do not reply to this email.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;
    }

    /**
     * Generate HTML template for admin notification
     */
    private static generateAdminNotificationHTML(data: any): string {
        return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Payment Received</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; }
        .details { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #10b981; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💰 New Payment Received</h1>
        </div>
        
        <div class="content">
          <div class="details">
            <h3>Customer Details:</h3>
            <p><strong>Name:</strong> ${data.customerName}</p>
            <p><strong>Email:</strong> ${data.customerEmail}</p>
            <p><strong>Mobile:</strong> ${data.customerMobile}</p>
          </div>
          
          <div class="details">
            <h3>Payment Details:</h3>
            <p><strong>Event:</strong> ${data.eventName}</p>
            <p><strong>Amount:</strong> ₹${data.amount}</p>
            <p><strong>Payment ID:</strong> ${data.paymentId}</p>
            <p><strong>Timestamp:</strong> ${data.timestamp}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;
    }
}
