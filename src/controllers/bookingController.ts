import { Request, Response } from "express";
import { pool } from "../config/db";
import { AuthRequest } from "../middlewares/auth";

export async function createBooking(req: AuthRequest, res: Response) {
    const { court_id, start_time, end_time } = req.body;
    const start = new Date(start_time);
    const end = new Date(end_time);

    if (start <= new Date()) {
        res.status(400).json({ message: "Waktu mulai harus di masa depan" });
        return;
    }

    try {
        const court = await pool.query(
            "SELECT id FROM courts WHERE id = $1 AND is_active = TRUE",
            [court_id]
        );
        if (court.rows.length === 0) {
            res.status(404).json({ message: "Lapangan tidak ditemukan" });
            return;
        }

        const result = await pool.query(
            `INSERT INTO bookings (user_id, court_id, start_time, end_time)
       VALUES ($1, $2, $3, $4) RETURNING *`,
            [req.user!.id, court_id, start.toISOString(), end.toISOString()]
        );
        res.status(201).json(result.rows[0]);
    } catch (err: any) {
        if (err.code === "23P01") {
            res.status(409).json({ message: "Slot waktu tersebut sudah dipesan" });
            return;
        }
        console.error(err);
        res.status(500).json({ message: "Terjadi kesalahan server" });
    }
}

export async function listMyBookings(req: AuthRequest, res: Response) {
    try {
        const result = await pool.query(
            `SELECT b.id, b.court_id, c.name AS court_name, b.start_time, b.end_time, b.status
       FROM bookings b JOIN courts c ON c.id = b.court_id
       WHERE b.user_id = $1
       ORDER BY b.start_time DESC`,
            [req.user!.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Terjadi kesalahan server" });
    }
}

export async function cancelBooking(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        res.status(400).json({ message: "ID tidak valid" });
        return;
    }
    const isAdmin = req.user!.role === "admin";

    try {
        const result = await pool.query(
            `UPDATE bookings SET status = 'cancelled'
       WHERE id = $1 AND status = 'confirmed' AND (user_id = $2 OR $3::boolean)
       RETURNING *`,
            [id, req.user!.id, isAdmin]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ message: "Booking tidak ditemukan atau tidak bisa dibatalkan" });
            return;
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Terjadi kesalahan server" });
    }
}

export async function getSchedule(req: Request, res: Response) {
    const courtId = Number(req.params.id);
    const from = new Date(String(req.query.from));
    const to = new Date(String(req.query.to));

    if (!Number.isInteger(courtId) || isNaN(from.getTime()) || isNaN(to.getTime())) {
        res.status(400).json({ message: "Parameter from dan to (format ISO) wajib diisi" });
        return;
    }

    try {
        const result = await pool.query(
            `SELECT id, start_time, end_time FROM bookings
       WHERE court_id = $1 AND status = 'confirmed'
         AND start_time < $3 AND end_time > $2
       ORDER BY start_time`,
            [courtId, from.toISOString(), to.toISOString()]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Terjadi kesalahan server" });
    }
}