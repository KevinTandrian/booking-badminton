import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import ETicketModal from "./ETicketModal";

type Booking = {
    id: number;
    court_name: string;
    start_time: string;
    end_time: string;
    status: string;
    order_id?: string;
    total_price?: number;
    payment_status?: string;
    snap_token?: string;
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
    const [payingId, setPayingId] = useState<number | null>(null);
    const [selectedTicket, setSelectedTicket] = useState<Booking | null>(null);

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

    async function payBooking(b: Booking) {
        const snap = (window as unknown as { snap?: { pay: (token: string, callbacks: Record<string, () => void>) => void } }).snap;

        // Jika ada token Snap resmi dan Midtrans aktif
        if (b.snap_token && !b.snap_token.startsWith("simulated-") && snap) {
            snap.pay(b.snap_token, {
                onSuccess: () => onChange(),
                onPending: () => onChange(),
                onError: () => setError("Pembayaran gagal"),
                onClose: () => onChange(),
            });
            return;
        }

        // Mode Simulasi Bayar Cepat
        if (!b.order_id) return;
        setPayingId(b.id);
        setError("");
        try {
            await api(`/payments/simulate/${b.order_id}`, { method: "POST" });
            onChange();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal memproses pembayaran");
        } finally {
            setPayingId(null);
        }
    }

    return (
        <div className="card">
            <h2 className="card-title">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Jadwal & Riwayat Booking Saya
            </h2>

            {error && (
                <div className="alert alert-danger">
                    <span>{error}</span>
                </div>
            )}

            {items.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-muted)" }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ margin: "0 auto 0.75rem", display: "block" }}>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <p style={{ fontWeight: 600, color: "#334155" }}>Belum ada jadwal booking aktif.</p>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Pesanan lapangan Anda akan muncul di halaman ini.</p>
                </div>
            ) : (
                <div>
                    {items.map((b) => {
                        const isPendingPayment = b.payment_status === "pending" || b.status === "pending";
                        const isPaid = b.payment_status === "paid" || b.status === "confirmed";
                        const isCancelled = b.status === "cancelled";

                        return (
                            <div key={b.id} className="booking-item">
                                <div>
                                    <div className="booking-court">{b.court_name}</div>
                                    <div className="booking-time">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <polyline points="12 6 12 12 16 14"></polyline>
                                        </svg>
                                        <span>
                                            {fmtDate(b.start_time)} • {fmtTime(b.start_time)} - {fmtTime(b.end_time)}
                                        </span>
                                    </div>
                                    {b.total_price ? (
                                        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                                            Total: <strong style={{ color: "#0f172a" }}>Rp {b.total_price.toLocaleString("id-ID")}</strong>
                                            {b.order_id && <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}> • {b.order_id}</span>}
                                        </div>
                                    ) : null}
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                                    {isPaid && !isCancelled && (
                                        <>
                                            <span className="booking-status-badge confirmed">
                                                ✓ LUNAS
                                            </span>
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem", color: "#1d4ed8", borderColor: "#93c5fd", background: "#eff6ff", fontWeight: 700 }}
                                                onClick={() => setSelectedTicket(b)}
                                            >
                                                🎫 Lihat E-Ticket
                                            </button>
                                        </>
                                    )}

                                    {isPendingPayment && !isCancelled && (
                                        <span style={{ background: "#fef3c7", color: "#b45309", border: "1px solid #fde68a", padding: "0.25rem 0.65rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700 }}>
                                            MENUNGGU BAYAR
                                        </span>
                                    )}

                                    {isCancelled && (
                                        <span className="booking-status-badge cancelled">
                                            DIBATALKAN
                                        </span>
                                    )}

                                    {isPendingPayment && !isCancelled && (
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            style={{ padding: "0.35rem 0.85rem", fontSize: "0.8rem" }}
                                            disabled={payingId === b.id}
                                            onClick={() => payBooking(b)}
                                        >
                                            {payingId === b.id ? "Memproses..." : "⚡ Bayar Sekarang"}
                                        </button>
                                    )}

                                    {!isCancelled && (
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
                        );
                    })}
                </div>
            )}

            {selectedTicket && (
                <ETicketModal
                    booking={selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                />
            )}
        </div>
    );
}
