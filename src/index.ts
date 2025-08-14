// ✅ Load environment variables first
import path from "path";
import dotenv from "dotenv";

// Always resolve from project root, not dist folder
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import cors from "cors";
import express from "express";
import { RouteNotFound } from "./middlewares/route-not-found";
import EventRouter from "./routes/EventRoutes";
import PaymentRouter from "./routes/PaymentRoute";

// 🔐 Validate required env vars immediately
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
	console.error("Razorpay credentials are not set in the environment variables.");
	process.exit(1);
}

// Setup Express
const app: express.Application = express();

// Parse ALLOWED_ORIGINS as array from comma-separated string
let allowedOrigins: string[] = [];
if (process.env.ALLOWED_ORIGINS) {
	allowedOrigins = process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim());
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

// Routes
app.use('/api/v1/events', EventRouter);
app.use('/api/v1/payment', PaymentRouter);

// 404 handler
app.use(RouteNotFound);

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log("Server is running on port " + port);
});

// Graceful shutdown
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
