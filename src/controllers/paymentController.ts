import { Request, Response } from "express";
import { pool } from "../config/db";
import { MidtransService } from "../services/midtrans";
import { HttpError } from "../errors";

export async function handleMidtransWebhook(req: Request, res: Response) {
    const {
        order_id,
        status_code,
        gross_amount,
        signature_key,
        transaction_status,
        fraud_status,
    } = req.body;

    if (!order_id || !status_code || !gross_amount) {
        throw new HttpError(400, "Payload webhook tidak valid");
    }

    // Verifikasi tanda tangan digital dari Midtrans
    const isValid = MidtransService.verifySignature(order_id, status_code, gross_amount, signature_key);
    if (!isValid) {
        console.warn(`[Midtrans Webhook] Invalid signature key for order: ${order_id}`);
        throw new HttpError(403, "Invalid signature key");
    }

    console.log(`[Midtrans Webhook] Menerima event order: ${order_id}, status: ${transaction_status}`);

    let newStatus = "pending";
    let newPaymentStatus = "pending";

    if (transaction_status === "capture") {
        if (fraud_status === "challenge") {
            newStatus = "pending";
            newPaymentStatus = "pending";
        } else if (fraud_status === "accept") {
            newStatus = "confirmed";
            newPaymentStatus = "paid";
        }
    } else if (transaction_status === "settlement") {
        newStatus = "confirmed";
        newPaymentStatus = "paid";
    } else if (
        transaction_status === "cancel" ||
        transaction_status === "deny" ||
        transaction_status === "expire"
    ) {
        newStatus = "cancelled";
        newPaymentStatus = transaction_status === "expire" ? "expired" : "failed";
    }

    const result = await pool.query(
        `UPDATE bookings 
         SET status = $1, payment_status = $2 
         WHERE order_id = $3 
         RETURNING id, order_id, status, payment_status`,
        [newStatus, newPaymentStatus, order_id]
    );

    if (result.rows.length === 0) {
        console.warn(`[Midtrans Webhook] Booking dengan order_id ${order_id} tidak ditemukan`);
    } else {
        console.log(`[Midtrans Webhook] Booking ${order_id} berhasil diperbarui ke status: ${newStatus} (${newPaymentStatus})`);
    }

    res.json({ status: "ok" });
}

export async function simulatePaymentSuccess(req: Request, res: Response) {
    const { orderId } = req.params;

    const result = await pool.query(
        `UPDATE bookings 
         SET status = 'confirmed', payment_status = 'paid' 
         WHERE order_id = $1 AND payment_status != 'paid' 
         RETURNING *`,
        [orderId]
    );

    if (result.rows.length === 0) {
        throw new HttpError(404, "Pesanan tidak ditemukan atau sudah dibayar");
    }

    res.json({
        message: "Simulasi pembayaran berhasil! Status pesanan kini telah lunas.",
        booking: result.rows[0],
    });
}

