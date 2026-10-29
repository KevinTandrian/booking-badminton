import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";

export function validate(schema: ZodType) {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const errors = result.error.issues.map((i) => ({
                field: i.path.join("."),
                message: i.message,
            }));
            res.status(400).json({ message: errors[0]?.message ?? "Data tidak valid", errors });
            return;
        }
        req.body = result.data;
        next();
    };
}