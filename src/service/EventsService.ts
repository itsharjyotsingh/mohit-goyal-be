import { IncomingHttpHeaders } from "http";
import { GeneralAppResponse } from "../types/response/general-app-response";
import { EventsRepository } from "../repository/EventsRepository";
import { EventsRequestBody } from "../types/events/event-fields";

export class EventsService {

    public static async findByParams(
        eventsQuery: any,
        eventsFields: IncomingHttpHeaders
    ): Promise<GeneralAppResponse<any[]>> {

        return await EventsRepository.findByParams(eventsQuery, eventsFields);
    }

    public static async createEvent(
        eventsBody: EventsRequestBody
    ): Promise<GeneralAppResponse<any[]>> {

        return await EventsRepository.createEvent(eventsBody);
    }
}