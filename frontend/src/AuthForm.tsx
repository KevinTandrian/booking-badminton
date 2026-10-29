import { useState, type FormEvent } from "react";
import { api } from "./api";

export default function AuthForm({ onLogin }: { onLogin: () => void }) {
    const [mode, setMode] = useState<"login" | "register">("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function submit(e: FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            if (mode === "register") {
                await api("/auth/register", {
                    method: "POST",
                    body: JSON.stringify({ name, email, password }),
                });
            }
            const { token } = await api<{ token: string }>("/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password }),
            });
            localStorage.setItem("token", token);
            onLogin();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
            setLoading(false);
        }
    }

    const input = { display: "block", width: "100%", padding: 8, marginBottom: 8 };

    return (
        <form onSubmit={submit} style={{ marginBottom: "2rem" }}>
            <h2>{mode === "login" ? "Masuk" : "Daftar"}</h2>
            {mode === "register" && (
                <input
                    style={input}
                    placeholder="Nama"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
            )}
            <input
                style={input}
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
            />
            <input
                style={input}
                type="password"
                placeholder="Password (min. 8 karakter)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
            />
            {error && <p style={{ color: "#f87171" }}>{error}</p>}
            <button type="submit" disabled={loading}>
                {loading ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}
            </button>
            <button
                type="button"
                style={{ marginLeft: 8 }}
                onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
                {mode === "login" ? "Belum punya akun?" : "Sudah punya akun?"}
            </button>
        </form>
    );
}