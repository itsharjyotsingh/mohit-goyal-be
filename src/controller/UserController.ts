import { Request, Response } from "express";
import HttpStatusCode from "../types/enums/http-status-codes";
import { UsersService } from "../service/UsersService";

export class UsersController {
    public static async createUser(req: Request, res: Response): Promise<any> {
        try {
            const { name, email, password } = req.body;

            if (!name || !email || !password) {
                return res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: "Missing required fields: name, email, password",
                });
            }

            const result = await UsersService.createUser({ name, email, password });

            if (!result.success) {
                return res.status(HttpStatusCode.BAD_REQUEST).json(result);
            }

            return res.status(HttpStatusCode.OK).json(result);
        } catch (error: any) {
            console.error(error);
            return res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Internal server error",
            });
        }
    }

    public static async login(req: Request, res: Response): Promise<any> {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: "Missing required fields: email, password",
                });
            }

            const result = await UsersService.login({ email, password });

            if (!result.success) {
                return res.status(HttpStatusCode.UNAUTHORIZED).json(result);
            }

            return res.status(HttpStatusCode.OK).json(result);
        } catch (error: any) {
            console.error(error);
            return res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
}
