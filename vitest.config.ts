import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        env: {
            DATABASE_URL: "postgres://postgres:rahasia123@localhost:5432/booking_test",
            JWT_SECRET: "secret-khusus-test",
        },
    },
});