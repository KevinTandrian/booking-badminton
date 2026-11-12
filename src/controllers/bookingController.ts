import { Request, Response } from "express";
import { pool } from "../config/db";
import { AuthRequest } from "../middlewares/auth";
import { HttpError } from "../errors";
import { MidtransService } from "../services/midtrans";

export async function createBooking(req: AuthRequest, res: Response) {
    const { court_id, start_time, end_time } = req.body;
    const start = new Date(start_time);
    const end = new Date(end_time);

    if (start <= new Date()) throw new HttpError(400, "Waktu mulai harus di masa depan");

    const courtRes = await pool.query(
        "SELECT id, name, price_per_hour FROM courts WHERE id = $1 AND is_active = TRUE",
        [court_id]
    );
    if (courtRes.rows.length === 0) throw new HttpError(404, "Lapangan tidak ditemukan atau tidak aktif");
    const court = courtRes.rows[0];

    // Hitung durasi jam dan total biaya
    const durationHours = Math.max(1, Math.round((end.getTime() - start.getTime()) / 3600000));
    const totalPrice = court.price_per_hour * durationHours;

    // Ambil data user untuk payload Midtrans
    const userRes = await pool.query("SELECT name, email FROM users WHERE id = $1", [req.user!.id]);
    const user = userRes.rows[0] ?? { name: "Pelanggan", email: "pelanggan@example.com" };

    const orderId = `BOOK-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Buat transaksi Midtrans Snap
    const snapResult = await MidtransService.createTransaction({
        orderId,
        grossAmount: totalPrice,
        customerName: user.name,
        customerEmail: user.email,
        itemName: `${court.name} (${durationHours} Jam)`,
    });

    try {
        const result = await pool.query(
            `INSERT INTO bookings (
                user_id, court_id, start_time, end_time, 
                status, order_id, total_price, payment_status, snap_token
             )
             VALUES ($1, $2, $3, $4, 'pending', $5, $6, 'pending', $7) 
             RETURNING *`,
            [
                req.user!.id,
                court_id,
                start.toISOString(),
                end.toISOString(),
                orderId,
                totalPrice,
                snapResult.token,
            ]
        );

        const booking = result.rows[0];
        res.status(201).json({
            ...booking,
            snap_token: snapResult.token,
            redirect_url: snapResult.redirectUrl,
            is_simulated: snapResult.isSimulated,
        });
    } catch (err: any) {
        if (err.code === "23P01") {
            throw new HttpError(409, "Slot waktu tersebut sudah dipesan atau sedang dalam proses pembayaran");
        }
        throw err;
    }
}

export async function listMyBookings(req: AuthRequest, res: Response) {
    const result = await pool.query(
        `SELECT b.id, b.court_id, c.name AS court_name, b.start_time, b.end_time, 
                b.status, b.order_id, b.total_price, b.payment_status, b.snap_token
         FROM bookings b JOIN courts c ON c.id = b.court_id
         WHERE b.user_id = $1
         ORDER BY b.start_time DESC`,
        [req.user!.id]
    );
    res.json(result.rows);
}

export async function cancelBooking(req: AuthRequest, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new HttpError(400, "ID tidak valid");
    const isAdmin = req.user!.role === "admin";

    const result = await pool.query(
        `UPDATE bookings 
         SET status = 'cancelled', 
             payment_status = CASE WHEN payment_status = 'paid' THEN 'failed' ELSE payment_status END
         WHERE id = $1 AND status IN ('confirmed', 'pending') AND (user_id = $2 OR $3::boolean)
         RETURNING *`,
        [id, req.user!.id, isAdmin]
    );
    if (result.rows.length === 0) {
        throw new HttpError(404, "Booking tidak ditemukan atau tidak bisa dibatalkan");
    }
    res.json(result.rows[0]);
}

export async function getSchedule(req: Request, res: Response) {
    const courtId = Number(req.params.id);
    const from = new Date(String(req.query.from));
    const to = new Date(String(req.query.to));

    if (!Number.isInteger(courtId) || isNaN(from.getTime()) || isNaN(to.getTime())) {
        throw new HttpError(400, "Parameter from dan to (format ISO) wajib diisi");
    }

    const result = await pool.query(
        `SELECT id, start_time, end_time, status FROM bookings
         WHERE court_id = $1 AND status IN ('confirmed', 'pending')
           AND start_time < $3 AND end_time > $2
         ORDER BY start_time`,
        [courtId, from.toISOString(), to.toISOString()]
    );
    res.json(result.rows);
}
