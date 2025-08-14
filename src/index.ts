import cors from 'cors'
import express from "express"
import path from "path";
import { RouteNotFound } from "./middlewares/route-not-found";
import EventRouter from "./routes/EventRoutes";
import dotenv from "dotenv";
import PaymentRouter from './routes/PaymentRoute';

dotenv.config({
	path: path.resolve(__dirname, "../.env"),
});

const app: express.Application = express();

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
	console.error("Razorpay credentials are not set in the environment variables.");
	process.exit(1);
}

let allowedOrigins: string[] = [];
if (process.env.ALLOWED_ORIGINS) {
	allowedOrigins = process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim());
}
else {
	allowedOrigins = ["http://localhost:5173"];
}

console.log("Allowed Origins: ", allowedOrigins);

app.use(
	cors({
		origin: allowedOrigins,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: [
			"Content-Type",
			"Authorization",
			"Accept",
			"Origin",
			"X-Requested-With",
			"X-CSRF-Token",
		],
	})
);

app.use(express.json());

app.use('/api/v1/events', EventRouter);
app.use('/api/v1/payment', PaymentRouter);

app.use(RouteNotFound)

let port = process.env.PORT || 3000;

app.listen(port, () => {
	console.log("Server is running on port " + port);
});

function setupGracefulShutdown() {
	const shutdown = () => {
		console.log("\n🛑 Shutting down gracefully...");
		console.log("✅ Server shutdown complete");
		process.exit(0);
	};

	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);
}

setupGracefulShutdown();


// node --env-file=.env dist/index.js