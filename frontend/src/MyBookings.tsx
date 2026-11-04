import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

type Booking = {
    id: number;
    court_name: string;
    start_time: string;
    end_time: string;
    status: string;
};

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
    });

const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

export default function MyBookings({
    refreshKey,
    onChange,
}: {
    refreshKey: number;
    onChange: () => void;
}) {
    const [items, setItems] = useState<Booking[]>([]);
    const [error, setError] = useState("");
    const [cancellingId, setCancellingId] = useState<number | null>(null);

    const load = useCallback(async () => {
        try {
            setItems(await api<Booking[]>("/bookings/me"));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Terjadi kesalahan saat memuat data");
        }
    }, []);

    useEffect(() => {
        load();
    }, [load, refreshKey]);

    async function cancel(id: number) {
        if (!confirm("Apakah Anda yakin ingin membatalkan booking ini?")) return;
        setError("");
        setCancellingId(id);
        try {
            await api(`/bookings/${id}/cancel`, { method: "PATCH" });
            onChange();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Gagal membatalkan booking");
        } finally {
            setCancellingId(null);
        }
    }

    return (
        <div className="card">
            <h2 className="card-title">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Riwayat Booking Saya
            </h2>

            {error && (
                <div className="alert alert-danger">
                    <span>{error}</span>
                </div>
            )}

            {items.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--text-dim)" }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: "0 auto 0.75rem", display: "block", opacity: 0.5 }}>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <p>Belum ada riwayat booking.</p>
                </div>
            ) : (
                <div>
                    {items.map((b) => (
                        <div key={b.id} className="booking-item">
                            <div>
                                <div className="booking-court">{b.court_name}</div>
                                <div className="booking-time">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12 6 12 12 16 14"></polyline>
                                    </svg>
                                    <span>
                                        {fmtDate(b.start_time)} • {fmtTime(b.start_time)} - {fmtTime(b.end_time)}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                <span className={`booking-status-badge ${b.status}`}>
                                    {b.status === "confirmed" ? "Terkonfirmasi" : "Dibatalkan"}
                                </span>

                                {b.status === "confirmed" && (
                                    <button
                                        type="button"
                                        className="btn btn-danger-ghost"
                                        disabled={cancellingId === b.id}
                                        onClick={() => cancel(b.id)}
                                    >
                                        {cancellingId === b.id ? "Membatalkan..." : "Batalkan"}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
