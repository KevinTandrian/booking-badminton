import "dotenv/config";
import { app } from "./app";

if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET belum diatur. Isi di file .env lalu jalankan ulang.");
    process.exit(1);
}

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server jalan di port ${port}`));