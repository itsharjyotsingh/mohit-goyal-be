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

  // New: insert an attempted purchase row tied to a Razorpay order id
  static async insertAttempt(
    event_id: string,
    customer_id: string,
    amount: number,
    currency: string,
    description: string,
    razorpay_order_id: string
  ) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `
        INSERT INTO event_purchases
          (event_id, customer_id, amount, currency, description, status, razorpay_order_id)
        VALUES ($1, $2, $3, $4, $5, 'attempted', $6)
        ON CONFLICT (razorpay_order_id) DO UPDATE
          SET amount = EXCLUDED.amount,
              currency = EXCLUDED.currency,
              description = EXCLUDED.description,
              updated_at = CURRENT_TIMESTAMP
        RETURNING id, razorpay_order_id, status
        `,
        [event_id, customer_id, amount, currency, description, razorpay_order_id]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Existing: generic full insert (kept for compatibility)
  static async insertPurchase(
    event_id: string,
    customer_id: string,
    amount: number,
    currency: string,
    description: string,
    status: string,
    razorpay_order_id: string,
    razorpay_payment_id: string | null,
    razorpay_signature: string | null
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

  // Existing: update arbitrary status + payment details
  static async updatePurchasePayment(
    razorpay_order_id: string,
    razorpay_payment_id: string | null,
    razorpay_signature: string | null,
    status: string
  ) {
    const client = await pool.connect();
    try {
      await client.query(
        `
        UPDATE event_purchases
        SET razorpay_payment_id = $1,
            razorpay_signature = $2,
            status = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE razorpay_order_id = $4
        `,
        [razorpay_payment_id, razorpay_signature, status, razorpay_order_id]
      );
    } finally {
      client.release();
    }
  }

  // Existing: mark paid (kept for compatibility)
  static async markPurchasePaid(razorpay_order_id: string, razorpay_payment_id: string) {
    const client = await pool.connect();
    try {
      await client.query(
        `
        UPDATE event_purchases
        SET status = 'paid',
            razorpay_payment_id = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE razorpay_order_id = $2
        `,
        [razorpay_payment_id, razorpay_order_id]
      );
    } finally {
      client.release();
    }
  }

  // New: mark failed by order id (useful on signature mismatch)
  static async markFailedByOrderId(razorpay_order_id: string, razorpay_signature?: string | null) {
    const client = await pool.connect();
    try {
      await client.query(
        `
        UPDATE event_purchases
        SET status = 'failed',
            razorpay_signature = COALESCE($2, razorpay_signature),
            updated_at = CURRENT_TIMESTAMP
        WHERE razorpay_order_id = $1
        `,
        [razorpay_order_id, razorpay_signature ?? null]
      );
    } finally {
      client.release();
    }
  }
}
