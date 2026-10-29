import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../config/db";
import { HttpError } from "../errors";

export async function register(req: Request, res: Response) {
    const { name, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);

    try {
        const result = await pool.query(
            "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, role",
            [name, email, hash]
        );
        res.status(201).json(result.rows[0]);
    } catch (err: any) {
        if (err.code === "23505") throw new HttpError(409, "Email sudah terdaftar");
        throw err;
    }
}

export async function login(req: Request, res: Response) {
    const { email, password } = req.body;

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    const valid = user && (await bcrypt.compare(password, user.password_hash));
    if (!valid) throw new HttpError(401, "Email atau password salah");

    const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET as string,
        { expiresIn: "1d" }
    );
    res.json({ token });
}