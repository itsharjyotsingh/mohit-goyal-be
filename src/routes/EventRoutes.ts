import { Router } from "express";
import { EventsController } from "../controller/EventsController";
import { verifyAuthToken } from "../middlewares/authenticate";

const EventRouter = Router();

EventRouter.get("/findByParams", EventsController.findByParams);
EventRouter.post("/", verifyAuthToken, EventsController.createEvent);

export default EventRouter;