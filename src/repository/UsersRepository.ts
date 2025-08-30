// src/repository/UsersRepository.ts
import { Pool, QueryResult } from "pg";
import pool from "../db-connection/pg-connect";
import bcrypt from "bcrypt";

export interface User {
  id: string;
  email: string;
  name: string;
  password?: string;
  created_at: Date;
  updated_at: Date;
}

export class UsersRepository {
  public static pool: Pool = pool;

  static async createUser(name: string, email: string, password: string): Promise<User> {
    const client = await pool.connect();
    try {
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const result: QueryResult = await client.query(
        `
        INSERT INTO users (name, email, password)
        VALUES ($1, $2, $3)
        RETURNING id, name, email, created_at, updated_at
        `,
        [name, email, hashedPassword]
      );

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async findUserByEmail(email: string): Promise<User | null> {
    const client = await pool.connect();
    try {
      const result: QueryResult = await client.query(
        "SELECT id, name, email, password, created_at, updated_at FROM users WHERE email = $1",
        [email]
      );

      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  static async userExistsByEmail(email: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      const result: QueryResult = await client.query(
        "SELECT 1 FROM users WHERE email = $1 LIMIT 1",
        [email]
      );

      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  static async findUserById(id: string): Promise<User | null> {
    const client = await pool.connect();
    try {
      const result: QueryResult = await client.query(
        "SELECT id, name, email, created_at, updated_at FROM users WHERE id = $1",
        [id]
      );

      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}
