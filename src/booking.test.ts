import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "./app";
import { pool } from "./config/db";

let token: string;
let courtId: number;

// Waktu acuan: 7 hari dari sekarang, pas di awal jam
const base = new Date(Date.now() + 7 * 24 * 3600 * 1000);
base.setUTCMinutes(0, 0, 0);
const at = (hour: number, minute = 0) =>
    new Date(base.getTime() + hour * 3600000 + minute * 60000).toISOString();

const book = (start: string, end: string, t: string = token) =>
    request(app)
        .post("/bookings")
        .set("Authorization", `Bearer ${t}`)
        .send({ court_id: courtId, start_time: start, end_time: end });

beforeAll(async () => {
    await pool.query("TRUNCATE bookings, courts, users RESTART IDENTITY CASCADE");

    await request(app)
        .post("/auth/register")
        .send({ name: "Penguji", email: "penguji@test.com", password: "rahasia123" });
    const login = await request(app)
        .post("/auth/login")
        .send({ email: "penguji@test.com", password: "rahasia123" });
    token = login.body.token;

    const court = await pool.query(
        "INSERT INTO courts (name, price_per_hour) VALUES ('Lapangan Test', 50000) RETURNING id"
    );
    courtId = court.rows[0].id;
});

beforeEach(async () => {
    await pool.query("TRUNCATE bookings RESTART IDENTITY");
});

afterAll(async () => {
    await pool.end();
});

describe("POST /bookings", () => {
    it("menerima booking pada slot kosong", async () => {
        const res = await book(at(0), at(1));
        expect(res.status).toBe(201);
        expect(res.body.status).toBe("confirmed");
    });

    it("menolak slot yang persis sama (409)", async () => {
        await book(at(0), at(1));
        const res = await book(at(0), at(1));
        expect(res.status).toBe(409);
    });

    it("menolak slot yang tumpang tindih sebagian (409)", async () => {
        await book(at(0), at(1));
        const res = await book(at(0, 30), at(1, 30));
        expect(res.status).toBe(409);
    });

    it("menerima slot yang berurutan tanpa tumpang tindih", async () => {
        await book(at(0), at(1));
        const res = await book(at(1), at(2));
        expect(res.status).toBe(201);
    });

    it("membolehkan pesan ulang setelah booking dibatalkan", async () => {
        const first = await book(at(0), at(1));
        await request(app)
            .patch(`/bookings/${first.body.id}/cancel`)
            .set("Authorization", `Bearer ${token}`);
        const res = await book(at(0), at(1));
        expect(res.status).toBe(201);
    });

    it("menolak permintaan tanpa token (401)", async () => {
        const res = await request(app)
            .post("/bookings")
            .send({ court_id: courtId, start_time: at(0), end_time: at(1) });
        expect(res.status).toBe(401);
    });

    it("hanya meloloskan satu dari 5 permintaan bersamaan ke slot yang sama", async () => {
        const results = await Promise.all(
            Array.from({ length: 5 }, () => book(at(0), at(1)))
        );
        const statuses = results.map((r) => r.status);
        expect(statuses.filter((s) => s === 201)).toHaveLength(1);
        expect(statuses.filter((s) => s === 409)).toHaveLength(4);
    });
});