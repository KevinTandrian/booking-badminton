import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../config/db";

export async function register(req: Request, res: Response) {
    const { name, email, password } = req.body;

    if (!name || !email || !password || password.length < 8) {
        res.status(400).json({ message: "Nama, email, dan password (min. 8 karakter) wajib diisi" });
        return;
    }

    try {
        const hash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, role",
            [name, email, hash]
        );
        res.status(201).json(result.rows[0]);
    } catch (err: any) {
        if (err.code === "23505") {
            res.status(409).json({ message: "Email sudah terdaftar" });
            return;
        }
        console.error(err);
        res.status(500).json({ message: "Terjadi kesalahan server" });
    }
}

export async function login(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({ message: "Email dan password wajib diisi" });
        return;
    }

    try {
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];
        const valid = user && (await bcrypt.compare(password, user.password_hash));

        if (!valid) {
            res.status(401).json({ message: "Email atau password salah" });
            return;
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET as string,
            { expiresIn: "1d" }
        );
        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Terjadi kesalahan server" });
    }
}