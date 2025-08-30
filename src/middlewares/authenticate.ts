// src/middlewares/verifyAuthToken.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extend Request with user
declare module "express-serve-static-core" {
    interface Request {
        user?: any;
    }
}

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secure-secret-key";

export function verifyAuthToken(req: Request, res: Response, next: NextFunction) {
    // Normalize header to a single string
    const raw = Array.isArray(req.headers.authorization)
        ? req.headers.authorization[0]
        : req.headers.authorization;

    const token = (raw || "").trim();

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized: Authorization header with JWT is required",
        });
    }

    try {
        const verifyOpts: jwt.VerifyOptions = {};

        const decoded = jwt.verify(token, JWT_SECRET, verifyOpts);
        req.user = decoded;
        return next();
    } catch (err: any) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ success: false, message: "Token expired" });
        }
        return res.status(401).json({ success: false, message: "Invalid token" });
    }
}
