import { useState, type FormEvent } from "react";
import { api } from "./api";

type Court = { id: number; name: string; price_per_hour: number };

export default function AdminPanel({
    courts,
    onChanged,
}: {
    courts: Court[];
    onChanged: () => void;
}) {
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState<{ id: number; name: string; price: string } | null>(null);

    function validPrice(value: string) {
        const n = Number(value);
        return Number.isInteger(n) && n > 0;
    }

    async function add(e: FormEvent) {
        e.preventDefault();
        setError("");
        setSuccess("");
        if (!validPrice(price)) {
            setError("Harga harus angka bulat positif lebih dari 0");
            return;
        }
        setLoading(true);
        try {
            await api("/courts", {
                method: "POST",
                body: JSON.stringify({ name, price_per_hour: Number(price) }),
            });
            setName("");
            setPrice("");
            setSuccess(`Lapangan "${name}" berhasil ditambahkan!`);
            onChanged();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal menambahkan lapangan");
        } finally {
            setLoading(false);
        }
    }

    async function save() {
        if (!editing) return;
        setError("");
        setSuccess("");
        if (!editing.name.trim() || !validPrice(editing.price)) {
            setError("Nama wajib diisi dan harga harus berupa angka bulat positif");
            return;
        }
        setLoading(true);
        try {
            await api(`/courts/${editing.id}`, {
                method: "PUT",
                body: JSON.stringify({ name: editing.name, price_per_hour: Number(editing.price) }),
            });
            setSuccess(`Lapangan "${editing.name}" berhasil diperbarui!`);
            setEditing(null);
            onChanged();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal memperbarui lapangan");
        } finally {
            setLoading(false);
        }
    }

    async function deactivate(id: number, courtName: string) {
        if (!confirm(`Apakah Anda yakin ingin menonaktifkan "${courtName}"?`)) return;
        setError("");
        setSuccess("");
        try {
            await api(`/courts/${id}`, {
                method: "PUT",
                body: JSON.stringify({ is_active: false }),
            });
            setSuccess(`Lapangan "${courtName}" berhasil dinonaktifkan.`);
            onChanged();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal menonaktifkan lapangan");
        }
    }

    return (
        <div className="card" style={{ border: "1px solid rgba(245, 158, 11, 0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <h2 className="card-title" style={{ margin: 0 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                    Panel Pengelolaan Lapangan
                </h2>
                <span className="role-badge admin">Mode Administrator</span>
            </div>

            {error && (
                <div className="alert alert-danger">
                    <span>{error}</span>
                </div>
            )}

            {success && (
                <div className="alert alert-success">
                    <span>{success}</span>
                </div>
            )}

            {/* Form Tambah Lapangan */}
            <form onSubmit={add} style={{ background: "var(--field)", padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--border)", marginBottom: "1.5rem" }}>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.75rem", color: "#fff" }}>
                    Tambah Lapangan Baru
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <div>
                        <label className="form-label">Nama Lapangan</label>
                        <input
                            placeholder="Contoh: Lapangan A (Vinyl)"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="form-label">Tarif per Jam (Rp)</label>
                        <input
                            placeholder="Contoh: 50000"
                            inputMode="numeric"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            required
                        />
                    </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? "Menyimpan..." : "+ Tambah Lapangan"}
                </button>
            </form>

            {/* Daftar Lapangan */}
            <div style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--text-muted)" }}>
                Daftar Lapangan Aktif ({courts.length})
            </div>

            {courts.length === 0 ? (
                <p style={{ color: "var(--text-dim)" }}>Belum ada lapangan.</p>
            ) : (
                courts.map((c) => (
                    <div key={c.id} className="admin-court-item">
                        {editing?.id === c.id ? (
                            <div style={{ display: "flex", gap: "0.5rem", flex: 1, flexWrap: "wrap" }}>
                                <input
                                    style={{ flex: 1, minWidth: 140 }}
                                    value={editing.name}
                                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                                />
                                <input
                                    style={{ width: 130 }}
                                    inputMode="numeric"
                                    value={editing.price}
                                    onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                                />
                                <button type="button" className="btn btn-primary" onClick={save} disabled={loading}>
                                    Simpan
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>
                                    Batal
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="admin-court-info">
                                    <strong style={{ color: "#fff", fontSize: "1rem" }}>{c.name}</strong>
                                    <span style={{ color: "var(--accent)", fontSize: "0.9rem" }}>
                                        Rp {c.price_per_hour.toLocaleString("id-ID")} <span style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>/ jam</span>
                                    </span>
                                </div>
                                <div className="admin-actions">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem" }}
                                        onClick={() =>
                                            setEditing({ id: c.id, name: c.name, price: String(c.price_per_hour) })
                                        }
                                    >
                                        Ubah Tarif
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-danger-ghost"
                                        onClick={() => deactivate(c.id, c.name)}
                                    >
                                        Nonaktifkan
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}
