import "dotenv/config";
import fs from "fs";
import path from "path";
import { pool } from "../src/config/db";

async function runMigration() {
    console.log("⚡ Menjalankan migrasi database pembayaran...");
    const client = await pool.connect();
    try {
        const sqlPath = path.join(__dirname, "migrate-payment.sql");
        const sql = fs.readFileSync(sqlPath, "utf-8");
        await client.query(sql);
        console.log("✅ Migrasi database pembayaran berhasil!");
    } catch (err) {
        console.error("❌ Gagal migrasi database:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();

