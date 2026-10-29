import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { pool } from "./config/db";
import authRoutes from "./routes/authRoutes";
import courtRoutes from "./routes/courtRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import morgan from "morgan";
import { notFound, errorHandler } from "./middlewares/errorHandler";

export const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim());

// Maksimal 20 permintaan ke /auth per 15 menit per alamat IP.
// Dilewati saat test supaya tes yang banyak login tidak ikut terblokir.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Terlalu banyak percobaan, coba lagi dalam beberapa menit" },
    skip: () => process.env.NODE_ENV === "test",
});

app.use(helmet());
app.use(morgan("tiny", { skip: () => process.env.NODE_ENV === "test" }));
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "10kb" }));

app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

app.get("/health/db", async (_req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");
        res.json({ status: "ok", time: result.rows[0].now });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: "error", message: "Database tidak terhubung" });
    }
});

app.use("/auth", authLimiter, authRoutes);
app.use("/courts", courtRoutes);
app.use("/bookings", bookingRoutes);
app.use(notFound);
app.use(errorHandler);