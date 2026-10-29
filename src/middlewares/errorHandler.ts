import { Request, Response, NextFunction } from "express";

export function notFound(_req: Request, res: Response) {
    res.status(404).json({ message: "Endpoint tidak ditemukan" });
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
    if (err?.type === "entity.parse.failed") {
        res.status(400).json({ message: "Format JSON tidak valid" });
        return;
    }
    if (err?.type === "entity.too.large") {
        res.status(413).json({ message: "Isi permintaan terlalu besar" });
        return;
    }
    console.error(err);
    res.status(500).json({ message: "Terjadi kesalahan server" });
}