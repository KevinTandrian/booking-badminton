import { Request, Response } from "express";
import { pool } from "../config/db";

export async function listCourts(_req: Request, res: Response) {
    try {
        const result = await pool.query(
            "SELECT id, name, price_per_hour FROM courts WHERE is_active = TRUE ORDER BY id"
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Terjadi kesalahan server" });
    }
}

export async function createCourt(req: Request, res: Response) {
    const { name, price_per_hour } = req.body;
    try {
        const result = await pool.query(
            "INSERT INTO courts (name, price_per_hour) VALUES ($1, $2) RETURNING *",
            [name, price_per_hour]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Terjadi kesalahan server" });
    }
}

export async function updateCourt(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        res.status(400).json({ message: "ID tidak valid" });
        return;
    }
    const { name, price_per_hour, is_active } = req.body;
    try {
        const result = await pool.query(
            `UPDATE courts
       SET name = COALESCE($1, name),
           price_per_hour = COALESCE($2, price_per_hour),
           is_active = COALESCE($3, is_active)
       WHERE id = $4
       RETURNING *`,
            [name ?? null, price_per_hour ?? null, is_active ?? null, id]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ message: "Lapangan tidak ditemukan" });
            return;
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Terjadi kesalahan server" });
    }
}