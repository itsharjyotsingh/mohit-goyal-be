// repositories/events-repository.ts
import { Pool, PoolClient, QueryResult } from 'pg';
import pool from '../db-connection/pg-connect';
import { GeneralAppResponse } from '../types/response/general-app-response';
import { EventsRequestBody } from '../types/events/event-fields';
import { AppJwtPayload, getBearerToken, verifyJwt } from '../utils/jwt';

class EventsRepository {
  protected tableName: string = 'events';
  public static pool: Pool = pool;

  private static arrayOfAdmins = ['mohit@gmail.com'];

  public static async findByParams(query: any, fields: any): Promise<GeneralAppResponse<any>> {
    const client: PoolClient = await EventsRepository.pool.connect();
    try {
      const values: any[] = [];
      const conditions: string[] = [];
      let paramIndex = 1;

      // Base: choose select list depending on whether customer details are requested and allowed
      const token = fields?.authorization;
      let isAdmin = false;

      if (token) {
        try {
          const user = verifyJwt(token);
          const email = user.email?.toLowerCase();
          isAdmin = !!email && EventsRepository.arrayOfAdmins.includes(email);
        } catch {
          isAdmin = false;
        }
      }

      // Optional filters
      if (query.id) {
        conditions.push(`e.id = $${paramIndex++}`);
        values.push(query.id);
      }

      // Visibility filter for non-admins; admins can optionally filter on is_hidden
      let forceHiddenClause = "";
      if (!isAdmin) {
        conditions.push(`e.is_hidden = false`);
      } else {
        if (fields?.ishidden !== undefined) {
          const isHiddenBool =
            typeof fields.ishidden === "string"
              ? fields.ishidden.toLowerCase() === "true"
              : !!fields.ishidden;
          conditions.push(`e.is_hidden = $${paramIndex++}`);
          values.push(isHiddenBool);
        }
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      // If admin and showCustomerDetails = true, include customer mapping and aggregates
      const showCustomerDetails =
        isAdmin &&
        (fields?.showcustomerdetails === true ||
          (typeof fields?.showcustomerdetails === "string" &&
            fields.showcustomerdetails.toLowerCase() === "true"));

      if (showCustomerDetails) {
        // Join purchases and customers; aggregate into arrays and counts
        // Note: JSON aggregation keeps a compact per-event payload.
        const queryText = `WITH ep_marked AS (
  SELECT
    ep.event_id,
    ep.customer_id,
    BOOL_OR(ep.status = 'paid') AS has_paid
  FROM event_purchases ep
  GROUP BY ep.event_id, ep.customer_id
)
SELECT
  e.id,
  e.price,
  e.title,
  e.description,
  e.event_date,
  e.event_time,
  e.event_duration,
  e.is_hidden,
  e.image_url,
  e.created_at,
  e.updated_at,

  -- Aggregates across all purchases for this event
  COALESCE(SUM(CASE WHEN ep.status IN ('created','paid','failed','refunded','attempted') THEN 1 ELSE 0 END), 0)::int AS total_registrations,
  COALESCE(SUM(CASE WHEN ep.status = 'paid' THEN 1 ELSE 0 END), 0)::int AS successful_payments,

  -- ✅ Divide by 100.0 to convert paise → rupees
  COALESCE(SUM(CASE WHEN ep.status = 'paid' THEN ep.amount ELSE 0 END) / 100.0, 0)::numeric(12,2) AS total_revenue,

  COALESCE(SUM(CASE WHEN ep.status IN ('created','failed','attempted') THEN 1 ELSE 0 END), 0)::int AS attempted_payments,

  -- Successful payments
  COALESCE((
    SELECT JSON_AGG(DISTINCT JSONB_BUILD_OBJECT(
             'customer', JSONB_BUILD_OBJECT(
               'id', c.id, 'name', c.name, 'email', c.email, 'mobile', c.mobile
             ),
             'paymentDetails', JSONB_BUILD_OBJECT(
               'purchase_id', ep2.id,
               -- ✅ also divide amount here
               'amount', ep2.amount / 100.0,
               'currency', ep2.currency,
               'status', ep2.status,
               'razorpay_order_id', ep2.razorpay_order_id,
               'razorpay_payment_id', ep2.razorpay_payment_id,
               'created_at', ep2.created_at
             )
           ))
    FROM event_purchases ep2
    JOIN customers c ON c.id = ep2.customer_id
    WHERE ep2.event_id = e.id
      AND ep2.status = 'paid'
  ), '[]'::json) AS "successfulPayment",

  -- Unsuccessful payments
  COALESCE((
    SELECT JSON_AGG(DISTINCT JSONB_BUILD_OBJECT(
             'customer', JSONB_BUILD_OBJECT(
               'id', c3.id, 'name', c3.name, 'email', c3.email, 'mobile', c3.mobile
             ),
             'paymentDetails', JSONB_BUILD_OBJECT(
               'purchase_id', lu.id,
               -- ✅ divide amount here too
               'amount', lu.amount / 100.0,
               'currency', lu.currency,
               'razorpay_order_id', lu.razorpay_order_id,
               'created_at', lu.created_at
             ),
             'reasonForUnsuccessfulPayment', lu.status::text
           ))
    FROM (
      SELECT DISTINCT ON (epx.customer_id)
             epx.*
      FROM event_purchases epx
      WHERE epx.event_id = e.id
        AND epx.status <> 'paid'
      ORDER BY epx.customer_id, epx.created_at DESC
    ) lu
    JOIN customers c3 ON c3.id = lu.customer_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM event_purchases ep_paid
      WHERE ep_paid.event_id = e.id
        AND ep_paid.customer_id = lu.customer_id
        AND ep_paid.status = 'paid'
    )
  ), '[]'::json) AS "unsuccessfulPayment"

FROM events e
LEFT JOIN event_purchases ep ON ep.event_id = e.id
${whereSql}
GROUP BY
  e.id, e.price, e.title, e.description, e.event_date, e.event_time,
  e.event_duration, e.is_hidden, e.image_url, e.created_at, e.updated_at
ORDER BY e.created_at DESC
`;


        const result: QueryResult<any> = await client.query(queryText, values);
        return { data: result.rows, success: true };
      }

      // Default (no customer details): plain events
      const queryText = `
      SELECT
        e.id,
        e.price,
        e.title,
        e.description,
        e.event_date,
        e.event_time,
        e.event_duration,
        e.is_hidden,
        e.image_url,
        e.created_at,
        e.updated_at
      FROM events e
      ${whereSql}
      ORDER BY e.created_at DESC
    `;

      const result: QueryResult<any> = await client.query(queryText, values);
      return { data: result.rows, success: true };
    } finally {
      client.release();
    }
  }


  public static async createEvent(body: EventsRequestBody): Promise<GeneralAppResponse<any>> {
    const client: PoolClient = await EventsRepository.pool.connect();
    try {
      const queryText = `
        INSERT INTO events (
          id, price, title, description, event_date, event_time, event_duration, is_hidden, image_url
        )
        VALUES (
          uuid_generate_v4(),
          $1, $2, $3, $4, $5, $6, $7, $8
        )
        RETURNING *;
      `;

      const values = [
        body.price,
        body.title,
        body.description,
        body.eventDate,
        body.eventTime,
        body.eventDuration,
        body.isHidden ?? true,
        body.imageUrl ?? null
      ];

      const result: QueryResult<any> = await client.query(queryText, values);
      return { data: result.rows, success: true };
    } finally {
      client.release();
    }
  }
}

export { EventsRepository };
