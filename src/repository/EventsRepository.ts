import { Pool, PoolClient, QueryResult } from 'pg';
import pool from '../db-connection/pg-connect';
import { GeneralAppResponse } from '../types/response/general-app-response';
import { EventsRequestBody } from '../types/events/event-fields';

class EventsRepository {
    protected tableName: string = 'events';
    public static pool: Pool = pool;

    public static async findByParams(query: any, fields: any): Promise<GeneralAppResponse<any>> {
    const client: PoolClient = await EventsRepository.pool.connect();
        try {
            let queryText = `SELECT * FROM events`;
            const values: any[] = [];
            const conditions: string[] = [];
            let paramIndex = 1;

            // If ID is provided
            if (query.id) {
                conditions.push(`id = $${paramIndex++}`);
                values.push(query.id);
            }

            // Handle isHidden filter — default to false if not provided
            if (fields.ishidden !== undefined) {
                conditions.push(`is_hidden = $${paramIndex++}`);
                values.push(fields.ishidden === 'true');
            } else {
                conditions.push(`is_hidden = false`);
            }

            // Append WHERE clause if there are conditions
            if (conditions.length > 0) {
                queryText += ` WHERE ` + conditions.join(' AND ');
            }

            const result: QueryResult<any> = await client.query(queryText, values);
            return {
                data: result.rows,
                success: true
            };
        } catch (error) {
            console.error('Error executing query', error);
            throw error;
        } finally {
            client.release();
        }
    }

    public static async createEvent(
        body: EventsRequestBody
    ): Promise<GeneralAppResponse<any>> {
        const client: PoolClient = await EventsRepository.pool.connect();
        try {
            const queryText = `
                INSERT INTO events (
                    id,
                    price,
                    title,
                    description,
                    event_date,
                    event_time,
                    event_duration,
                    is_hidden,
                    image_url
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
            return {
                data: result.rows[0],
                success: true
            };
        } catch (error) {
            console.error('Error executing query', error);
            throw error;
        } finally {
            client.release();
        }
    }
}

export { EventsRepository }