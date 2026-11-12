import { useEffect, useState, type FormEvent } from "react";
import { api } from "./api";

type Court = { id: number; name: string; price_per_hour: number };
type Slot = { id: number; start_time: string; end_time: string };

type BookingResponse = {
    id: number;
    order_id: string;
    court_id: number;
    total_price: number;
    status: string;
    payment_status: string;
    snap_token?: string;
    redirect_url?: string;
    is_simulated?: boolean;
};

// Jam operasional: 07:00 - 22:00 (slot terakhir 21:00 - 22:00)
const OPERATING_HOURS = Array.from({ length: 15 }, (_, i) => i + 7);

function getDateString(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
}

export default function BookingForm({
    courts,
    refreshKey,
    onBooked,
    isLoggedIn,
    onRequestLogin,
}: {
    courts: Court[];
    refreshKey: number;
    onBooked: () => void;
    isLoggedIn: boolean;
    onRequestLogin: () => void;
}) {
    const [courtId, setCourtId] = useState<number | null>(null);
    const [date, setDate] = useState(getDateString(0));
    const [hour, setHour] = useState(18);
    const [duration, setDuration] = useState(1);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [pendingOrder, setPendingOrder] = useState<BookingResponse | null>(null);

    const selectedId = courtId ?? courts[0]?.id;
    const selectedCourt = courts.find((c) => c.id === selectedId);

    // Muat jadwal terisi untuk lapangan & tanggal yang dipilih
    useEffect(() => {
        if (!selectedId || !date) return;
        const from = new Date(`${date}T00:00:00`);
        const to = new Date(from);
        to.setDate(to.getDate() + 1);
        const q = `from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
        api<Slot[]>(`/courts/${selectedId}/schedule?${q}`)
            .then(setSlots)
            .catch((e) => setError(e.message));
    }, [selectedId, date, refreshKey]);

    useEffect(() => {
        setError("");
        setMessage("");
    }, [selectedId, date, hour, duration]);

    // Cek apakah jam tertentu sudah terisi (booked)
    function isHourBooked(h: number) {
        if (!date) return false;
        const slotStart = new Date(`${date}T${String(h).padStart(2, "0")}:00:00`);
        const slotEnd = new Date(slotStart.getTime() + 3600000);

        return slots.some((s) => {
            const bStart = new Date(s.start_time);
            const bEnd = new Date(s.end_time);
            return slotStart < bEnd && slotEnd > bStart;
        });
    }

    // Cek apakah jam tertentu berada dalam durasi yang sedang dipilih
    function isInSelectedRange(h: number) {
        return h >= hour && h < hour + duration;
    }

    // Cek apakah range durasi saat ini bentrok dengan slot yang terisi
    const hasCollision = Array.from({ length: duration }, (_, i) => hour + i).some((h) =>
        isHourBooked(h)
    );

    const endHour = hour + duration;
    const isPastClosing = endHour > 22;

    async function triggerSimulatedPayment(orderId: string) {
        setLoading(true);
        setError("");
        try {
            await api(`/payments/simulate/${orderId}`, { method: "POST" });
            setMessage("Pembayaran sukses dikonfirmasi! Status pesanan Anda kini telah LUNAS.");
            setPendingOrder(null);
            onBooked();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal mengonfirmasi pembayaran simulasi");
        } finally {
            setLoading(false);
        }
    }

    async function submit(e: FormEvent) {
        e.preventDefault();

        // Jika user belum login, buka modal login agar mereka bisa masuk terlebih dahulu
        if (!isLoggedIn) {
            onRequestLogin();
            return;
        }

        if (!selectedId) return;

        if (hasCollision) {
            setError("Waktu yang dipilih bertabrakan dengan jadwal yang sudah dipesan.");
            return;
        }

        if (isPastClosing) {
            setError("Jam selesai melebihi jam operasional lapangan (maksimal 22:00).");
            return;
        }

        setError("");
        setMessage("");
        setPendingOrder(null);
        setLoading(true);

        try {
            const start = new Date(`${date}T${String(hour).padStart(2, "0")}:00:00`);
            const end = new Date(start.getTime() + duration * 3600000);
            const res = await api<BookingResponse>("/bookings", {
                method: "POST",
                body: JSON.stringify({
                    court_id: selectedId,
                    start_time: start.toISOString(),
                    end_time: end.toISOString(),
                }),
            });

            // Cek apakah ada popup Midtrans Snap JS di window
            const snap = (window as unknown as { snap?: { pay: (token: string, callbacks: Record<string, () => void>) => void } }).snap;

            if (!res.is_simulated && res.snap_token && snap) {
                // Membuka popup pembayaran resmi Midtrans Snap (QRIS, VA BCA/Mandiri, dll.)
                snap.pay(res.snap_token, {
                    onSuccess: () => {
                        setMessage(`Pembayaran berhasil! Booking untuk ${selectedCourt?.name} telah terkonfirmasi.`);
                        onBooked();
                    },
                    onPending: () => {
                        setMessage(`Pesanan ${res.order_id} dibuat! Menunggu pembayaran diselesaikan.`);
                        onBooked();
                    },
                    onError: () => {
                        setError("Pembayaran ditolak atau gagal.");
                        onBooked();
                    },
                    onClose: () => {
                        onBooked();
                    },
                });
            } else {
                // Mode Sandbox Simulator untuk Portofolio
                setPendingOrder(res);
                setMessage(`Pemesanan berhasil dibuat (Order ID: ${res.order_id}). Silakan selesaikan pembayaran.`);
                onBooked();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memproses booking");
        } finally {
            setLoading(false);
        }
    }

    if (courts.length === 0) {
        return (
            <div className="card">
                <p style={{ color: "var(--text-muted)", textAlign: "center" }}>Sedang memuat data lapangan...</p>
            </div>
        );
    }

    const today = getDateString(0);
    const tomorrow = getDateString(1);
    const dayAfter = getDateString(2);

    return (
        <div className="card">
            <h2 className="card-title">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Pilih Jadwal & Pesan Lapangan
            </h2>

            <form onSubmit={submit}>
                {/* Langkah 1: Pilih Lapangan */}
                <div className="form-group">
                    <label className="form-label">Langkah 1: Pilih Lapangan</label>
                    <div className="court-grid">
                        {courts.map((c) => {
                            const isSelected = c.id === selectedId;
                            return (
                                <div
                                    key={c.id}
                                    className={`court-card ${isSelected ? "selected" : ""}`}
                                    onClick={() => setCourtId(c.id)}
                                >
                                    <div className="court-header">
                                        <div className="court-name">{c.name}</div>
                                        {isSelected && (
                                            <span className="court-badge-selected">✓ Dipilih</span>
                                        )}
                                    </div>
                                    <div className="court-price">
                                        Rp {c.price_per_hour.toLocaleString("id-ID")} <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "normal" }}>/ jam</span>
                                    </div>
                                    <div className="court-meta">
                                        <span>🏸 Karpet Standar PBSI</span>
                                        <span>•</span>
                                        <span>💡 Lampu LED</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Langkah 2: Pilih Tanggal & Durasi */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "0.5rem" }}>
                    <div className="form-group">
                        <label className="form-label">Langkah 2: Tanggal Main</label>
                        <input
                            type="date"
                            min={today}
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                        <div className="date-quick-bar">
                            <button
                                type="button"
                                className={`btn-chip ${date === today ? "active" : ""}`}
                                onClick={() => setDate(today)}
                            >
                                Hari Ini
                            </button>
                            <button
                                type="button"
                                className={`btn-chip ${date === tomorrow ? "active" : ""}`}
                                onClick={() => setDate(tomorrow)}
                            >
                                Besok
                            </button>
                            <button
                                type="button"
                                className={`btn-chip ${date === dayAfter ? "active" : ""}`}
                                onClick={() => setDate(dayAfter)}
                            >
                                Lusa
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Durasi Main</label>
                        <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                            <option value={1}>1 Jam</option>
                            <option value={2}>2 Jam</option>
                            <option value={3}>3 Jam</option>
                        </select>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.45rem" }}>
                            Selesai main: pukul <strong>{String(endHour).padStart(2, "0")}:00</strong>
                        </div>
                    </div>
                </div>

                {/* Langkah 3: Visual Time-Slot Grid */}
                <div className="slots-container">
                    <div className="slot-grid-header">
                        <div>
                            <label className="form-label" style={{ margin: 0, fontSize: "0.95rem" }}>
                                Langkah 3: Pilih Jam Mulai Main
                            </label>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                Klik kotak jam yang masih kosong untuk memilih
                            </div>
                        </div>

                        <div className="slot-legend">
                            <div className="legend-item">
                                <span className="legend-box available"></span>
                                <span>Tersedia</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-box selected"></span>
                                <span>Pilihan Anda</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-box booked"></span>
                                <span>Sudah Terisi</span>
                            </div>
                        </div>
                    </div>

                    <div className="time-slot-grid">
                        {OPERATING_HOURS.map((h) => {
                            const booked = isHourBooked(h);
                            const selected = h === hour;
                            const inRange = isInSelectedRange(h);

                            let stateClass = "";
                            if (booked) {
                                stateClass = "booked";
                            } else if (selected) {
                                stateClass = "selected";
                            } else if (inRange) {
                                stateClass = "in-range";
                            }

                            return (
                                <button
                                    key={h}
                                    type="button"
                                    disabled={booked}
                                    className={`slot-button ${stateClass}`}
                                    onClick={() => setHour(h)}
                                    title={booked ? "Slot jam ini sudah dipesan" : `Pilih main jam ${String(h).padStart(2, "0")}:00`}
                                >
                                    <span className="slot-time">{String(h).padStart(2, "0")}:00</span>
                                    <span className="slot-status">
                                        {booked ? "Terisi" : selected ? "Mulai" : inRange ? "Dalam Durasi" : "Kosong"}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Notifikasi Error & Bentrok */}
                {hasCollision && (
                    <div className="alert alert-danger">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span>
                            <strong>Slot Bentrok!</strong> Ada jam yang sudah terisi antara pukul {String(hour).padStart(2, "0")}:00 s/d {String(endHour).padStart(2, "0")}:00. Silakan pilih jam lain.
                        </span>
                    </div>
                )}

                {isPastClosing && (
                    <div className="alert alert-danger">
                        <span>Jam selesai ({String(endHour).padStart(2, "0")}:00) melewati jam tutup operasional (22:00).</span>
                    </div>
                )}

                {error && (
                    <div className="alert alert-danger">
                        <span>{error}</span>
                    </div>
                )}

                {message && (
                    <div className="alert alert-success">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        <span>{message}</span>
                    </div>
                )}

                {/* Modal / Card Simulasi Pembayaran Sandbox */}
                {pendingOrder && (
                    <div style={{ background: "#f0fdf4", border: "2px dashed #16a34a", padding: "1.25rem", borderRadius: "12px", marginBottom: "1.25rem", textAlign: "center" }}>
                        <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#166534", marginBottom: "0.4rem" }}>
                            💳 Pembayaran Midtrans Snap (Sandbox Simulation)
                        </div>
                        <p style={{ fontSize: "0.85rem", color: "#15803d", marginBottom: "0.85rem" }}>
                            Order ID: <strong>{pendingOrder.order_id}</strong> • Total: <strong>Rp {pendingOrder.total_price.toLocaleString("id-ID")}</strong>
                        </p>
                        <button
                            type="button"
                            className="btn btn-primary"
                            disabled={loading}
                            onClick={() => triggerSimulatedPayment(pendingOrder.order_id)}
                        >
                            {loading ? "Memproses..." : "⚡ Bayar Sekarang (Simulasi Lunas)"}
                        </button>
                    </div>
                )}

                {/* Ringkasan Pesanan & Tombol Aksi */}
                <div className="summary-box">
                    <div className="summary-details">
                        <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", fontWeight: 700 }}>
                            Ringkasan Jadwal Pesanan
                        </div>
                        <strong>{selectedCourt?.name}</strong> • {date} (Pukul {String(hour).padStart(2, "0")}:00 - {String(endHour).padStart(2, "0")}:00, {duration} jam)
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600 }}>Total Tarif</div>
                        <div className="summary-price">
                            Rp {((selectedCourt?.price_per_hour ?? 0) * duration).toLocaleString("id-ID")}
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: "1.25rem" }}>
                    <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        disabled={loading || hasCollision || isPastClosing}
                    >
                        {loading
                            ? "Memproses Pemesanan & Pembayaran..."
                            : isLoggedIn
                            ? "Lanjut ke Pembayaran (Midtrans)"
                            : "Pesan Sekarang (Masuk untuk Menyelesaikan)"}
                    </button>
                    {!isLoggedIn && (
                        <p style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.6rem" }}>
                            Belum punya akun? Anda bisa daftar gratis hanya dalam hitungan detik.
                        </p>
                    )}
                </div>
            </form>
        </div>
    );
}
