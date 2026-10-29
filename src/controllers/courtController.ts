import { Request, Response } from "express";
import { pool } from "../config/db";
import { HttpError } from "../errors";

export async function listCourts(_req: Request, res: Response) {
    const result = await pool.query(
        "SELECT id, name, price_per_hour FROM courts WHERE is_active = TRUE ORDER BY id"
    );
    res.json(result.rows);
}

export async function createCourt(req: Request, res: Response) {
    const { name, price_per_hour } = req.body;
    const result = await pool.query(
        "INSERT INTO courts (name, price_per_hour) VALUES ($1, $2) RETURNING *",
        [name, price_per_hour]
    );
    res.status(201).json(result.rows[0]);
}

export async function updateCourt(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new HttpError(400, "ID tidak valid");

    const { name, price_per_hour, is_active } = req.body;
    const result = await pool.query(
        `UPDATE courts
     SET name = COALESCE($1, name),
         price_per_hour = COALESCE($2, price_per_hour),
         is_active = COALESCE($3, is_active)
     WHERE id = $4
     RETURNING *`,
        [name ?? null, price_per_hour ?? null, is_active ?? null, id]
    );
    if (result.rows.length === 0) throw new HttpError(404, "Lapangan tidak ditemukan");
    res.json(result.rows[0]);
}