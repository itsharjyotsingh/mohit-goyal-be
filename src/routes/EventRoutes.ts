import { Router } from "express";
import { EventsController } from "../controller/EventsController";

const EventRouter = Router();

EventRouter.get("/findByParams",EventsController.findByParams);
EventRouter.post("/", EventsController.createEvent);

export default EventRouter;