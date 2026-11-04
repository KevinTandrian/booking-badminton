import { useState, type FormEvent } from "react";
import { api } from "./api";

export default function AuthForm({
    onLogin,
    subtitle,
}: {
    onLogin: () => void;
    subtitle?: string;
}) {
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
            setError(err instanceof Error ? err.message : "Terjadi kesalahan saat otentikasi");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            {subtitle && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "0.75rem 1rem", borderRadius: "10px", fontSize: "0.85rem", marginBottom: "1.25rem", textAlign: "center" }}>
                    {subtitle}
                </div>
            )}

            {/* Navigasi Tab Masuk / Daftar */}
            <div className="nav-tabs" style={{ marginBottom: "1.25rem" }}>
                <button
                    type="button"
                    className={`tab-btn ${mode === "login" ? "active" : ""}`}
                    onClick={() => {
                        setMode("login");
                        setError("");
                    }}
                >
                    Masuk
                </button>
                <button
                    type="button"
                    className={`tab-btn ${mode === "register" ? "active" : ""}`}
                    onClick={() => {
                        setMode("register");
                        setError("");
                    }}
                >
                    Daftar Akun Baru
                </button>
            </div>

            <form onSubmit={submit}>
                {mode === "register" && (
                    <div className="form-group">
                        <label className="form-label">Nama Lengkap</label>
                        <input
                            placeholder="Contoh: Budi Santoso"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                )}

                <div className="form-group">
                    <label className="form-label">Alamat Email</label>
                    <input
                        type="email"
                        placeholder="nama@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Password</label>
                    <input
                        type="password"
                        placeholder="Minimal 8 karakter"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                    />
                </div>

                {error && (
                    <div className="alert alert-danger">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span>{error}</span>
                    </div>
                )}

                <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                    {loading ? "Memproses..." : mode === "login" ? "Masuk ke Akun" : "Daftar Sekarang"}
                </button>
            </form>
        </div>
    );
}
