// src/repository/PaymentsRepository.ts
import { Pool, QueryResult } from "pg";
import pool from "../db-connection/pg-connect";


export class PaymentsRepository {
    public static pool: Pool = pool;

    static async findEventById(event_id: string) {
        const client = await pool.connect();
        try {
            const result: QueryResult = await client.query(
                "SELECT * FROM events WHERE id = $1",
                [event_id]
            );
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    static async findOrCreateCustomer(name: string, email: string, mobile: string) {
        const client = await pool.connect();
        try {
            // If email is unique in your schema, you can use ON CONFLICT
            const result = await client.query(
                `
        INSERT INTO customers (name, email, mobile)
        VALUES ($1, $2, $3)
        ON CONFLICT (email) DO UPDATE 
          SET name = EXCLUDED.name, 
              mobile = EXCLUDED.mobile, 
              updated_at = CURRENT_TIMESTAMP
        RETURNING id
        `,
                [name, email, mobile]
            );
            return result.rows[0].id;
        } finally {
            client.release();
        }
    }

    static async insertPurchase(
        event_id: string,
        customer_id: string,
        amount: number,
        currency: string,
        description: string,
        status: string,
        razorpay_order_id: string,
        razorpay_payment_id: string,
        razorpay_signature: string
    ) {
        const client = await pool.connect();
        try {
            const result = await client.query(
                `
        INSERT INTO event_purchases
          (event_id, customer_id, amount, currency, description, status, razorpay_order_id, razorpay_payment_id, razorpay_signature)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, razorpay_order_id, status
        `,
                [
                    event_id,
                    customer_id,
                    amount,
                    currency,
                    description,
                    status,
                    razorpay_order_id,
                    razorpay_payment_id,
                    razorpay_signature,
                ]
            );
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    static async updatePurchasePayment(
        razorpay_order_id: string,
        razorpay_payment_id: string,
        razorpay_signature: string,
        status: string
    ) {
        const client = await pool.connect();
        try {
            await client.query(
                `
        UPDATE event_purchases
        SET razorpay_payment_id=$1,
            razorpay_signature=$2,
            status=$3,
            updated_at=CURRENT_TIMESTAMP
        WHERE razorpay_order_id=$4
        `,
                [razorpay_payment_id, razorpay_signature, status, razorpay_order_id]
            );
        } finally {
            client.release();
        }
    }

    static async markPurchasePaid(razorpay_order_id: string, razorpay_payment_id: string) {
        const client = await pool.connect();
        try {
            await client.query(
                `
        UPDATE event_purchases
        SET status='paid',
            razorpay_payment_id=$1,
            updated_at=CURRENT_TIMESTAMP
        WHERE razorpay_order_id=$2
        `,
                [razorpay_payment_id, razorpay_order_id]
            );
        } finally {
            client.release();
        }
    }
}
