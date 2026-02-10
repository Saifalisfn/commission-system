import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

// Routes
import authRoutes from "./routes/auth.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import reportRoutes from "./routes/report.routes.js";
import exportRoutes from "./routes/export.routes.js";
import filingLockRoutes from "./routes/filingLock.routes.js";

// Error handler
import { errorHandler } from "./middleware/error.middleware.js";

// Load env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 🔥 REQUIRED FOR RENDER / PROXIES
app.set("trust proxy", 1);



// ===============================
// 🔐 SECURITY
// ===============================
app.use(helmet());



// ===============================
// 🌐 CORS (PRODUCTION SAFE)
// ===============================
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.DEV_FRONTEND_URL
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // Postman, cron, server calls

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS blocked: Origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);



// ===============================
// 🚦 RATE LIMITING
// ===============================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

app.use("/api/", limiter);



// ===============================
// 📦 BODY PARSERS
// ===============================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));



// ===============================
// ❤️ HEALTH CHECK
// ===============================
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});



// ===============================
// 📡 API ROUTES
// ===============================
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/transactions", transactionRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/export", exportRoutes);
app.use("/api/v1/filing-locks", filingLockRoutes);



// ===============================
// ❗ ERROR HANDLER (LAST)
// ===============================
app.use(errorHandler);



// ===============================
// 🗄 DATABASE + SERVER
// ===============================
const MONGO_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/commission_db";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  })
  .catch((error) => {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  });

export default app;
