import { EventsService } from "../service/EventsService";
import HttpStatusCode from "../types/enums/http-status-codes";
import { GeneralAppResponse, isGeneralAppFailureResponse } from "../types/response/general-app-response";
import { Request, Response } from 'express';

export class EventsController {
    public static async findByParams(req: Request, res: Response) : Promise<any> {
        try {
            const result: GeneralAppResponse<any[]> = await EventsService.findByParams(req.query, req.headers);
            if(isGeneralAppFailureResponse(result)) {
                return res.status(result.statusCode).json({
                    success: false,
                    message: result.businessMessage,
                    error: result.error
                });
            }
            return res.status(HttpStatusCode.OK).json(result);
        }
        catch (error) {
            console.log(error);
            return res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    public static async createEvent(req: Request, res: Response) : Promise<any> {
        try {
            const result: GeneralAppResponse<any[]> = await EventsService.createEvent(req.body);
            if(isGeneralAppFailureResponse(result)) {
                return res.status(result.statusCode).json({
                    success: false,
                    message: result.businessMessage,
                    error: result.error
                });
            }
            return res.status(HttpStatusCode.OK).json(result);
        }
        catch (error) {
            console.log(error);
            return res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}