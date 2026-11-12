import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool } from "../src/config/db";

async function seed() {
    console.log("🌱 Memulai proses seeding database...");

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // 1. Buat User Demo (Admin & Member)
        const passwordHash = await bcrypt.hash("password123", 10);

        console.log("Creating demo users...");
        const adminRes = await client.query(
            `INSERT INTO users (name, email, password_hash, role)
             VALUES ('Admin Demo (GOR)', 'admin@badminton.demo', $1, 'admin')
             ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
             RETURNING id`,
            [passwordHash]
        );
        const adminId = adminRes.rows[0].id;

        const memberRes = await client.query(
            `INSERT INTO users (name, email, password_hash, role)
             VALUES ('Budi Santoso (Member)', 'user@badminton.demo', $1, 'customer')
             ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
             RETURNING id`,
            [passwordHash]
        );
        const memberId = memberRes.rows[0].id;

        // 2. Buat Lapangan Contoh
        console.log("Creating courts...");
        const court1 = await client.query(
            `INSERT INTO courts (name, price_per_hour, is_active)
             VALUES ('Lapangan 1 - Vinyl Standar BWF', 50000, true)
             RETURNING id`
        );
        const court2 = await client.query(
            `INSERT INTO courts (name, price_per_hour, is_active)
             VALUES ('Lapangan 2 - Karpet Standar PBSI', 45000, true)
             RETURNING id`
        );
        const court3 = await client.query(
            `INSERT INTO courts (name, price_per_hour, is_active)
             VALUES ('Lapangan 3 - Parquet Kayu Premium', 60000, true)
             RETURNING id`
        );

        const c1Id = court1.rows[0].id;
        const c2Id = court2.rows[0].id;

        // 3. Buat Booking Contoh untuk Hari Ini (agar ada slot yang terisi)
        console.log("Creating initial sample bookings...");
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, "0");
        const d = String(today.getDate()).padStart(2, "0");

        // Slot 1: Jam 09:00 - 11:00 di Lapangan 1
        const start1 = new Date(`${y}-${m}-${d}T09:00:00+08:00`);
        const end1 = new Date(`${y}-${m}-${d}T11:00:00+08:00`);

        // Slot 2: Jam 19:00 - 21:00 di Lapangan 1
        const start2 = new Date(`${y}-${m}-${d}T19:00:00+08:00`);
        const end2 = new Date(`${y}-${m}-${d}T21:00:00+08:00`);

        // Slot 3: Jam 16:00 - 18:00 di Lapangan 2
        const start3 = new Date(`${y}-${m}-${d}T16:00:00+08:00`);
        const end3 = new Date(`${y}-${m}-${d}T18:00:00+08:00`);

        await client.query(
            `INSERT INTO bookings (user_id, court_id, start_time, end_time, status)
             VALUES 
                ($1, $2, $3, $4, 'confirmed'),
                ($1, $2, $5, $6, 'confirmed'),
                ($1, $7, $8, $9, 'confirmed')
             ON CONFLICT DO NOTHING`,
            [memberId, c1Id, start1.toISOString(), end1.toISOString(), start2.toISOString(), end2.toISOString(), c2Id, start3.toISOString(), end3.toISOString()]
        );

        await client.query("COMMIT");
        console.log("✅ Seeding database berhasil!");
        console.log("-----------------------------------------");
        console.log("Akun Admin:  admin@badminton.demo | password123");
        console.log("Akun Member: user@badminton.demo  | password123");
        console.log("-----------------------------------------");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Gagal seeding database:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();

