import "dotenv/config";
import express from "express";
import { pool } from "./config/db";
import authRoutes from "./routes/authRoutes";
import courtRoutes from "./routes/courtRoutes";

const app = express();
app.use(express.json());

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

const port = process.env.PORT || 3000;
app.use("/auth", authRoutes);
app.use("/courts", courtRoutes);
app.listen(port, () => console.log(`Server jalan di port ${port}`));