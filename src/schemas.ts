import { z } from "zod";

export const registerSchema = z.object({
    name: z.string().trim().min(1, "Nama wajib diisi").max(100, "Nama maksimal 100 karakter"),
    email: z.string().trim().toLowerCase().email("Format email tidak valid").max(150),
    password: z.string().min(8, "Password minimal 8 karakter").max(72, "Password maksimal 72 karakter"),
});

export const loginSchema = z.object({
    email: z.string().trim().toLowerCase().email("Format email tidak valid"),
    password: z.string().min(1, "Password wajib diisi"),
});

export const createCourtSchema = z.object({
    name: z.string().trim().min(1, "Nama lapangan wajib diisi").max(100),
    price_per_hour: z.number().int("Harga harus bilangan bulat").positive("Harga harus lebih dari 0"),
});

export const updateCourtSchema = z
    .object({
        name: z.string().trim().min(1).max(100).optional(),
        price_per_hour: z.number().int().positive().optional(),
        is_active: z.boolean().optional(),
    })
    .refine((d) => Object.keys(d).length > 0, "Minimal satu field harus diisi");

export const createBookingSchema = z
    .object({
        court_id: z.number().int().positive("court_id tidak valid"),
        start_time: z.string().datetime({ offset: true, message: "start_time harus format ISO 8601" }),
        end_time: z.string().datetime({ offset: true, message: "end_time harus format ISO 8601" }),
    })
    .refine((d) => new Date(d.end_time) > new Date(d.start_time), {
        message: "end_time harus setelah start_time",
        path: ["end_time"],
    });