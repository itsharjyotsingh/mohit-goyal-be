import { Router } from "express";
import { PaymentsController } from "../controller/PaymentsController";

const PaymentRouter = Router();

PaymentRouter.post("/createOrder", PaymentsController.createOrder);
PaymentRouter.post("/verifyPayment", PaymentsController.verifyPayment);

export default PaymentRouter;