import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "./app";
import { pool } from "./config/db";

let alice: string;
let bob: string;
let admin: string;
let courtId: number;

async function signup(name: string, email: string, role = "customer") {
    await request(app)
        .post("/auth/register")
        .send({ name, email, password: "rahasia123" });
    if (role !== "customer") {
        await pool.query("UPDATE users SET role = $1 WHERE email = $2", [role, email]);
    }
    const res = await request(app)
        .post("/auth/login")
        .send({ email, password: "rahasia123" });
    return res.body.token as string;
}

// Slot 1 jam, `day` hari setelah 5 hari dari sekarang
const slot = (day: number) => {
    const start = new Date(Date.now() + (5 + day) * 24 * 3600 * 1000);
    start.setUTCMinutes(0, 0, 0);
    return {
        start: start.toISOString(),
        end: new Date(start.getTime() + 3600000).toISOString(),
    };
};

const bookAs = (token: string, start: string, end: string, court = courtId) =>
    request(app)
        .post("/bookings")
        .set("Authorization", `Bearer ${token}`)
        .send({ court_id: court, start_time: start, end_time: end });

beforeAll(async () => {
    await pool.query("TRUNCATE bookings, courts, users RESTART IDENTITY CASCADE");
    alice = await signup("Alice", "alice@test.com");
    bob = await signup("Bob", "bob@test.com");
    admin = await signup("Admin", "admin@test.com", "admin");

    const court = await request(app)
        .post("/courts")
        .set("Authorization", `Bearer ${admin}`)
        .send({ name: "Lapangan A", price_per_hour: 50000 });
    courtId = court.body.id;
});

afterAll(async () => {
    await pool.end();
});

describe("auth", () => {
    it("registrasi tidak mengembalikan password", async () => {
        const res = await request(app)
            .post("/auth/register")
            .send({ name: "Cici", email: "cici@test.com", password: "rahasia123" });
        expect(res.status).toBe(201);
        expect(res.body.password_hash).toBeUndefined();
        expect(res.body.password).toBeUndefined();
    });

    it("menolak email yang sudah terdaftar (409)", async () => {
        const res = await request(app)
            .post("/auth/register")
            .send({ name: "Alice 2", email: "alice@test.com", password: "rahasia123" });
        expect(res.status).toBe(409);
    });

    it("menolak password kurang dari 8 karakter (400)", async () => {
        const res = await request(app)
            .post("/auth/register")
            .send({ name: "Dedi", email: "dedi@test.com", password: "pendek" });
        expect(res.status).toBe(400);
    });

    it("menolak login dengan password salah (401)", async () => {
        const res = await request(app)
            .post("/auth/login")
            .send({ email: "alice@test.com", password: "salahsalah" });
        expect(res.status).toBe(401);
    });

    it("menolak login dengan email yang tidak ada (401)", async () => {
        const res = await request(app)
            .post("/auth/login")
            .send({ email: "tidakada@test.com", password: "rahasia123" });
        expect(res.status).toBe(401);
    });

    it("menolak format email tidak valid (400)", async () => {
        const res = await request(app)
            .post("/auth/register")
            .send({ name: "Eko", email: "bukan-email", password: "rahasia123" });
        expect(res.status).toBe(400);
    });

    it("menolak registrasi tanpa nama (400)", async () => {
        const res = await request(app)
            .post("/auth/register")
            .send({ email: "fani@test.com", password: "rahasia123" });
        expect(res.status).toBe(400);
    });

    it("email tidak membedakan huruf besar-kecil", async () => {
        const res = await request(app)
            .post("/auth/login")
            .send({ email: "ALICE@test.com", password: "rahasia123" });
        expect(res.status).toBe(200);
    });
});

describe("courts", () => {
    it("daftar lapangan bisa dilihat tanpa login", async () => {
        const res = await request(app).get("/courts");
        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
    });

    it("menolak tambah lapangan tanpa token (401)", async () => {
        const res = await request(app)
            .post("/courts")
            .send({ name: "X", price_per_hour: 1000 });
        expect(res.status).toBe(401);
    });

    it("menolak tambah lapangan oleh pelanggan (403)", async () => {
        const res = await request(app)
            .post("/courts")
            .set("Authorization", `Bearer ${alice}`)
            .send({ name: "X", price_per_hour: 1000 });
        expect(res.status).toBe(403);
    });

    it("menolak harga tidak valid (400)", async () => {
        const res = await request(app)
            .post("/courts")
            .set("Authorization", `Bearer ${admin}`)
            .send({ name: "X", price_per_hour: -5 });
        expect(res.status).toBe(400);
    });

    it("lapangan yang dinonaktifkan tidak muncul di daftar", async () => {
        const created = await request(app)
            .post("/courts")
            .set("Authorization", `Bearer ${admin}`)
            .send({ name: "Sementara", price_per_hour: 40000 });
        await request(app)
            .put(`/courts/${created.body.id}`)
            .set("Authorization", `Bearer ${admin}`)
            .send({ is_active: false });
        const list = await request(app).get("/courts");
        const names = list.body.map((c: { name: string }) => c.name);
        expect(names).not.toContain("Sementara");
    });

    it("mengubah lapangan yang tidak ada mengembalikan 404", async () => {
        const res = await request(app)
            .put("/courts/99999")
            .set("Authorization", `Bearer ${admin}`)
            .send({ name: "Hantu" });
        expect(res.status).toBe(404);
    });
});

describe("bookings: validasi dan hak akses", () => {
    it("menolak booking di waktu yang sudah lewat (400)", async () => {
        const start = new Date(Date.now() - 3600000).toISOString();
        const end = new Date(Date.now() + 3600000).toISOString();
        const res = await bookAs(alice, start, end);
        expect(res.status).toBe(400);
    });

    it("menolak booking untuk lapangan yang tidak ada (404)", async () => {
        const s = slot(0);
        const res = await bookAs(alice, s.start, s.end, 99999);
        expect(res.status).toBe(404);
    });

    it("riwayat booking hanya menampilkan milik sendiri", async () => {
        const s = slot(1);
        const created = await bookAs(alice, s.start, s.end);
        const mine = await request(app)
            .get("/bookings/me")
            .set("Authorization", `Bearer ${alice}`);
        const theirs = await request(app)
            .get("/bookings/me")
            .set("Authorization", `Bearer ${bob}`);
        const aliceIds = mine.body.map((b: { id: number }) => b.id);
        const bobIds = theirs.body.map((b: { id: number }) => b.id);
        expect(aliceIds).toContain(created.body.id);
        expect(bobIds).not.toContain(created.body.id);
    });

    it("pelanggan tidak bisa membatalkan booking milik orang lain (404)", async () => {
        const s = slot(2);
        const created = await bookAs(alice, s.start, s.end);
        const res = await request(app)
            .patch(`/bookings/${created.body.id}/cancel`)
            .set("Authorization", `Bearer ${bob}`);
        expect(res.status).toBe(404);
    });

    it("pemilik bisa membatalkan booking sendiri", async () => {
        const s = slot(3);
        const created = await bookAs(alice, s.start, s.end);
        const res = await request(app)
            .patch(`/bookings/${created.body.id}/cancel`)
            .set("Authorization", `Bearer ${alice}`);
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("cancelled");
    });

    it("admin bisa membatalkan booking milik siapa pun", async () => {
        const s = slot(4);
        const created = await bookAs(alice, s.start, s.end);
        const res = await request(app)
            .patch(`/bookings/${created.body.id}/cancel`)
            .set("Authorization", `Bearer ${admin}`);
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("cancelled");
    });

    it("booking yang sudah dibatalkan tidak bisa dibatalkan lagi (404)", async () => {
        const s = slot(5);
        const created = await bookAs(alice, s.start, s.end);
        await request(app)
            .patch(`/bookings/${created.body.id}/cancel`)
            .set("Authorization", `Bearer ${alice}`);
        const again = await request(app)
            .patch(`/bookings/${created.body.id}/cancel`)
            .set("Authorization", `Bearer ${alice}`);
        expect(again.status).toBe(404);
    });

    it("menolak end_time sebelum start_time (400)", async () => {
        const s = slot(6);
        const res = await bookAs(alice, s.end, s.start);
        expect(res.status).toBe(400);
    });
});
describe("keamanan", () => {
    it("tidak membocorkan header X-Powered-By", async () => {
        const res = await request(app).get("/health");
        expect(res.headers["x-powered-by"]).toBeUndefined();
    });

    it("mengizinkan CORS dari alamat frontend", async () => {
        const res = await request(app).get("/health").set("Origin", "http://localhost:5173");
        expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    });

    it("tidak mengizinkan CORS dari situs lain", async () => {
        const res = await request(app).get("/health").set("Origin", "http://situs-jahat.example");
        expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    });
});