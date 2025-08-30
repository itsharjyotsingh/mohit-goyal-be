// src/services/UsersService.ts
import jwt from "jsonwebtoken";
import { User, UsersRepository } from "../repository/UsersRepository";

export interface CreateUserInput {
    name: string;
    email: string;
    password: string;
}

export interface LoginInput {
    email: string;
    password: string;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    data?: {
        user: Omit<User, 'password'>;
        token: string;
    };
}

export interface LoginResponse {
    success: boolean;
    message: string;
    data?: {
        user: Omit<User, 'password'>;
        token: string;
    };
}

export class UsersService {
    private static JWT_SECRET = process.env.JWT_SECRET || "your-super-secure-secret-key";
    private static JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

    // Create a new user account
    static async createUser(input: CreateUserInput): Promise<AuthResponse> {
        try {
            // Validate input
            if (!input.name || !input.email || !input.password) {
                return {
                    success: false,
                    message: "Name, email, and password are required"
                };
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(input.email)) {
                return {
                    success: false,
                    message: "Please provide a valid email address"
                };
            }

            // Validate password strength (min 6 chars)
            if (input.password.length < 6) {
                return {
                    success: false,
                    message: "Password must be at least 6 characters long"
                };
            }

            // Check if user already exists
            const existingUser = await UsersRepository.userExistsByEmail(input.email.toLowerCase());
            if (existingUser) {
                return {
                    success: false,
                    message: "User with this email already exists"
                };
            }

            // Create user
            const user = await UsersRepository.createUser(
                input.name.trim(),
                input.email.toLowerCase(),
                input.password
            );

            // Generate JWT token
            const token = this.generateToken({
                id: user.id,
                email: user.email,
                name: user.name
            });

            // Return user data without password
            const { password, ...userWithoutPassword } = user;

            return {
                success: true,
                message: "User created successfully",
                data: {
                    user: userWithoutPassword,
                    token
                }
            };

        } catch (error) {
            console.error("Error creating user:", error);
            return {
                success: false,
                message: "Failed to create user. Please try again."
            };
        }
    }

    // Authenticate user and return token
    static async login(input: LoginInput): Promise<LoginResponse> {
        try {
            // Validate input
            if (!input.email || !input.password) {
                return {
                    success: false,
                    message: "Email and password are required"
                };
            }

            // Find user by email
            const user = await UsersRepository.findUserByEmail(input.email.toLowerCase());
            if (!user) {
                return {
                    success: false,
                    message: "Invalid email or password"
                };
            }

            // Verify password
            const isPasswordValid = await UsersRepository.verifyPassword(input.password, user.password!);
            if (!isPasswordValid) {
                return {
                    success: false,
                    message: "Invalid email or password"
                };
            }

            // Generate JWT token
            const token = this.generateToken({
                id: user.id,
                email: user.email,
                name: user.name
            });

            // Return user data without password
            const { password, ...userWithoutPassword } = user;

            return {
                success: true,
                message: "Login successful",
                data: {
                    user: userWithoutPassword,
                    token
                }
            };

        } catch (error) {
            console.error("Error during login:", error);
            return {
                success: false,
                message: "Login failed. Please try again."
            };
        }
    }

    // Generate JWT token
    private static generateToken(payload: { id: string; email: string; name: string }): string {
        return jwt.sign(
            payload ?? '',
            this.JWT_SECRET ?? '',
        );
    }

    // Verify JWT token (utility method)
    static verifyToken(token: string): { id: string; email: string; name: string } | null {
        try {
            const decoded = jwt.verify(token, this.JWT_SECRET) as any;
            return {
                id: decoded.id,
                email: decoded.email,
                name: decoded.name
            };
        } catch (error) {
            return null;
        }
    }
}
