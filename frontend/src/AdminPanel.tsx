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
    const [editing, setEditing] = useState<{ id: number; name: string; price: string } | null>(null);

    const input = { padding: 8, marginRight: 8 };

    function validPrice(value: string) {
        const n = Number(value);
        return Number.isInteger(n) && n > 0;
    }

    async function add(e: FormEvent) {
        e.preventDefault();
        setError("");
        if (!validPrice(price)) {
            setError("Harga harus angka bulat lebih dari 0");
            return;
        }
        try {
            await api("/courts", {
                method: "POST",
                body: JSON.stringify({ name, price_per_hour: Number(price) }),
            });
            setName("");
            setPrice("");
            onChanged();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        }
    }

    async function save() {
        if (!editing) return;
        setError("");
        if (!editing.name || !validPrice(editing.price)) {
            setError("Nama wajib diisi dan harga harus angka bulat lebih dari 0");
            return;
        }
        try {
            await api(`/courts/${editing.id}`, {
                method: "PUT",
                body: JSON.stringify({ name: editing.name, price_per_hour: Number(editing.price) }),
            });
            setEditing(null);
            onChanged();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        }
    }

    async function deactivate(id: number) {
        if (!confirm("Nonaktifkan lapangan ini?")) return;
        setError("");
        try {
            await api(`/courts/${id}`, {
                method: "PUT",
                body: JSON.stringify({ is_active: false }),
            });
            onChanged();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        }
    }

    return (
        <div style={{ marginBottom: "2rem", padding: 12, border: "1px solid #374151" }}>
            <h2>Panel Admin: Kelola Lapangan</h2>

            <form onSubmit={add} style={{ marginBottom: 16 }}>
                <input
                    style={input}
                    placeholder="Nama lapangan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
                <input
                    style={input}
                    placeholder="Harga per jam"
                    inputMode="numeric"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                />
                <button type="submit">Tambah</button>
            </form>

            {error && <p style={{ color: "#f87171" }}>{error}</p>}

            <ul>
                {courts.map((c) => (
                    <li key={c.id} style={{ marginBottom: 8 }}>
                        {editing?.id === c.id ? (
                            <>
                                <input
                                    style={input}
                                    value={editing.name}
                                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                                />
                                <input
                                    style={input}
                                    inputMode="numeric"
                                    value={editing.price}
                                    onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                                />
                                <button onClick={save}>Simpan</button>{" "}
                                <button onClick={() => setEditing(null)}>Batal</button>
                            </>
                        ) : (
                            <>
                                {c.name}: Rp {c.price_per_hour.toLocaleString("id-ID")}/jam{" "}
                                <button
                                    onClick={() =>
                                        setEditing({ id: c.id, name: c.name, price: String(c.price_per_hour) })
                                    }
                                >
                                    Ubah
                                </button>{" "}
                                <button onClick={() => deactivate(c.id)}>Nonaktifkan</button>
                            </>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}