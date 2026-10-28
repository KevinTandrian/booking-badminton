import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
    user?: { id: number; role: string };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        res.status(401).json({ message: "Token tidak ada" });
        return;
    }
    try {
        const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET as string) as {
            id: number;
            role: string;
        };
        req.user = { id: payload.id, role: payload.role };
        next();
    } catch {
        res.status(401).json({ message: "Token tidak valid atau kedaluwarsa" });
    }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
    if (req.user?.role !== "admin") {
        res.status(403).json({ message: "Hanya admin yang boleh mengakses" });
        return;
    }
    next();
}