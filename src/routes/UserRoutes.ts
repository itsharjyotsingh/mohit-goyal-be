import { Router } from "express";
import { EventsController } from "../controller/EventsController";
import { UsersController } from "../controller/UserController";

const UserRouter = Router();

UserRouter.post("/login", UsersController.login);
UserRouter.post("/", UsersController.createUser);

export default UserRouter;