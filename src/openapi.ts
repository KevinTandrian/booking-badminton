const bearer = [{ bearerAuth: [] }];

const error = (description: string) => ({
    description,
    content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
});

export const openapi = {
    openapi: "3.0.3",
    info: {
        title: "Booking Badminton API",
        version: "1.0.0",
        description:
            "API pemesanan lapangan bulutangkis. Double booking dicegah oleh exclusion constraint PostgreSQL dan dijawab dengan 409.",
    },
    tags: [{ name: "Auth" }, { name: "Courts" }, { name: "Bookings" }],
    components: {
        securitySchemes: {
            bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
        schemas: {
            Error: {
                type: "object",
                properties: { message: { type: "string", example: "Pesan error" } },
            },
            Court: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 1 },
                    name: { type: "string", example: "Lapangan 1" },
                    price_per_hour: { type: "integer", example: 50000 },
                },
            },
            Booking: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 1 },
                    user_id: { type: "integer", example: 1 },
                    court_id: { type: "integer", example: 1 },
                    start_time: { type: "string", format: "date-time" },
                    end_time: { type: "string", format: "date-time" },
                    status: { type: "string", enum: ["confirmed", "cancelled"] },
                },
            },
        },
    },
    paths: {
        "/auth/register": {
            post: {
                tags: ["Auth"],
                summary: "Daftar akun baru",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["name", "email", "password"],
                                properties: {
                                    name: { type: "string", example: "Kevin" },
                                    email: { type: "string", format: "email", example: "kevin@test.com" },
                                    password: { type: "string", minLength: 8, example: "rahasia123" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "201": { description: "Akun dibuat" },
                    "400": error("Data tidak valid"),
                    "409": error("Email sudah terdaftar"),
                },
            },
        },
        "/auth/login": {
            post: {
                tags: ["Auth"],
                summary: "Login dan dapatkan token JWT",
                description: "Dibatasi 20 permintaan per 15 menit per IP (429 jika terlampaui).",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["email", "password"],
                                properties: {
                                    email: { type: "string", format: "email", example: "kevin@test.com" },
                                    password: { type: "string", example: "rahasia123" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Token JWT (berlaku 1 hari)",
                        content: {
                            "application/json": {
                                schema: { type: "object", properties: { token: { type: "string" } } },
                            },
                        },
                    },
                    "401": error("Email atau password salah"),
                    "429": error("Terlalu banyak percobaan"),
                },
            },
        },
        "/courts": {
            get: {
                tags: ["Courts"],
                summary: "Daftar lapangan aktif",
                responses: {
                    "200": {
                        description: "Daftar lapangan",
                        content: {
                            "application/json": {
                                schema: { type: "array", items: { $ref: "#/components/schemas/Court" } },
                            },
                        },
                    },
                },
            },
            post: {
                tags: ["Courts"],
                summary: "Tambah lapangan (admin)",
                security: bearer,
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["name", "price_per_hour"],
                                properties: {
                                    name: { type: "string", example: "Lapangan 2" },
                                    price_per_hour: { type: "integer", example: 60000 },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "201": { description: "Lapangan dibuat" },
                    "400": error("Data tidak valid"),
                    "401": error("Token tidak ada atau tidak valid"),
                    "403": error("Bukan admin"),
                },
            },
        },
        "/courts/{id}": {
            put: {
                tags: ["Courts"],
                summary: "Ubah atau nonaktifkan lapangan (admin)",
                security: bearer,
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    price_per_hour: { type: "integer" },
                                    is_active: { type: "boolean" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": { description: "Lapangan diperbarui" },
                    "400": error("Data tidak valid"),
                    "401": error("Token tidak ada atau tidak valid"),
                    "403": error("Bukan admin"),
                    "404": error("Lapangan tidak ditemukan"),
                },
            },
        },
        "/courts/{id}/schedule": {
            get: {
                tags: ["Courts"],
                summary: "Slot yang sudah terisi pada rentang waktu",
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "integer" } },
                    { name: "from", in: "query", required: true, schema: { type: "string", format: "date-time" } },
                    { name: "to", in: "query", required: true, schema: { type: "string", format: "date-time" } },
                ],
                responses: {
                    "200": { description: "Daftar slot terisi" },
                    "400": error("Parameter tidak valid"),
                },
            },
        },
        "/bookings": {
            post: {
                tags: ["Bookings"],
                summary: "Buat booking",
                security: bearer,
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["court_id", "start_time", "end_time"],
                                properties: {
                                    court_id: { type: "integer", example: 1 },
                                    start_time: { type: "string", format: "date-time", example: "2026-12-05T18:00:00+08:00" },
                                    end_time: { type: "string", format: "date-time", example: "2026-12-05T19:00:00+08:00" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Booking dibuat",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/Booking" } } },
                    },
                    "400": error("Data tidak valid atau waktu sudah lewat"),
                    "401": error("Token tidak ada atau tidak valid"),
                    "404": error("Lapangan tidak ditemukan"),
                    "409": error("Slot waktu tersebut sudah dipesan"),
                },
            },
        },
        "/bookings/me": {
            get: {
                tags: ["Bookings"],
                summary: "Riwayat booking milik sendiri",
                security: bearer,
                responses: {
                    "200": { description: "Daftar booking" },
                    "401": error("Token tidak ada atau tidak valid"),
                },
            },
        },
        "/bookings/{id}/cancel": {
            patch: {
                tags: ["Bookings"],
                summary: "Batalkan booking (pemilik atau admin)",
                security: bearer,
                parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                responses: {
                    "200": { description: "Booking dibatalkan" },
                    "401": error("Token tidak ada atau tidak valid"),
                    "404": error("Booking tidak ditemukan atau tidak bisa dibatalkan"),
                },
            },
        },
    },
};