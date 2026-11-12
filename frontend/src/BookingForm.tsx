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

// Jam operasional lapangan: 07:00 - 22:00 WIB (jam mulai main)
const OPERATING_HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

function getDateString(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
}

function getCourtBadges(name: string) {
    if (name.toLowerCase().includes("parquet") || name.toLowerCase().includes("kayu")) {
        return ["🏸 Parquet Kayu Solid", "💡 Lampu LED Presisi", "❄️ Suhu Sejuk", "👥 Single & Double"];
    }
    if (name.toLowerCase().includes("karpet") || name.toLowerCase().includes("pbsi")) {
        return ["🏸 Karpet Standar PBSI", "💡 Lampu Sorot LED", "❄️ Kipas Blower", "👥 Standar Turnamen"];
    }
    return ["🏸 Karpet Vinyl BWF Biru", "💡 600 Lux Anti-Silau", "❄️ Exhaust Air Blower", "👥 Standar Dunia"];
}

export default function BookingForm({
    courts,
    refreshKey,
    onBooked,
    isLoggedIn,
    onRequestLogin,
    onViewMyBookings,
}: {
    courts: Court[];
    refreshKey: number;
    onBooked: () => void;
    isLoggedIn: boolean;
    onRequestLogin: () => void;
    onViewMyBookings?: () => void;
}) {
    const [courtId, setCourtId] = useState<number | null>(null);
    const [date, setDate] = useState(getDateString(0));
    const [hour, setHour] = useState(18);
    const [duration, setDuration] = useState(2); // default 2 jam yang paling populer
    const [slots, setSlots] = useState<Slot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [pendingOrder, setPendingOrder] = useState<BookingResponse | null>(null);
    const [paidOrder, setPaidOrder] = useState<BookingResponse | null>(null);
    const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" } | null>(null);

    function showToast(msg: string, type: "success" | "info" | "warning" = "info") {
        setToast({ message: msg, type });
        setTimeout(() => {
            setToast((curr) => (curr?.message === msg ? null : curr));
        }, 3000);
    }

    const selectedId = courtId ?? courts[0]?.id;
    const selectedCourt = courts.find((c) => c.id === selectedId);

    // Muat jadwal terisi untuk lapangan & tanggal yang dipilih
    useEffect(() => {
        if (!selectedId || !date) return;
        setLoadingSlots(true);
        const from = new Date(`${date}T00:00:00`);
        const to = new Date(from);
        to.setDate(to.getDate() + 1);
        const q = `from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
        api<Slot[]>(`/courts/${selectedId}/schedule?${q}`)
            .then(setSlots)
            .catch((e) => setError(e.message))
            .finally(() => setLoadingSlots(false));
    }, [selectedId, date, refreshKey]);

    useEffect(() => {
        setError("");
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

    // Cek apakah range durasi saat ini bentrok dengan slot yang terisi (hanya dicek saat memilih, bukan saat bayar)
    const hasCollision = Array.from({ length: duration }, (_, i) => hour + i).some((h) =>
        isHourBooked(h)
    );

    const endHour = hour + duration;
    const isPastClosing = endHour > 22;

    function resetToNewBooking() {
        setPendingOrder(null);
        setPaidOrder(null);
        setError("");
        // Cari jam yang kosong terdekat atau default 18
        setHour(18);
        onBooked();
    }

    async function triggerSimulatedPayment(orderId: string) {
        setLoading(true);
        setError("");
        try {
            await api(`/payments/simulate/${orderId}`, { method: "POST" });
            showToast("Pembayaran Lunas! E-Ticket berhasil diterbitkan.", "success");
            setPaidOrder(pendingOrder);
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
                // Membuka popup pembayaran resmi Midtrans Snap
                snap.pay(res.snap_token, {
                    onSuccess: () => {
                        setPaidOrder(res);
                        setPendingOrder(null);
                        onBooked();
                    },
                    onPending: () => {
                        setPendingOrder(res);
                        onBooked();
                    },
                    onError: () => {
                        setError("Pembayaran ditolak atau dibatalkan oleh Midtrans.");
                    },
                    onClose: () => {
                        setPendingOrder(res);
                    },
                });
            } else {
                // Mode Sandbox Simulator untuk Portofolio -> Langsung alihkan ke layar checkout
                setPendingOrder(res);
                showToast("Pesanan dibuat! Silakan selesaikan pembayaran.", "info");
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

    // =========================================================================
    // TAMPILAN 1: PEMBAYARAN SUKSES & E-TICKET TERBIT (STATE: PAID)
    // =========================================================================
    if (paidOrder) {
        return (
            <div className="card">
                {/* Stepper: Semua Selesai */}
                <div className="booking-stepper" aria-label="Alur Pemesanan Lapangan">
                    <div className="stepper-step completed">
                        <div className="stepper-number">✓</div>
                        <span className="stepper-title">1. Pilih Lapangan</span>
                    </div>
                    <div className="stepper-line completed"></div>
                    <div className="stepper-step completed">
                        <div className="stepper-number">✓</div>
                        <span className="stepper-title">2. Pilih Jadwal & Jam</span>
                    </div>
                    <div className="stepper-line completed"></div>
                    <div className="stepper-step completed">
                        <div className="stepper-number">✓</div>
                        <span className="stepper-title">3. Pembayaran Lunas</span>
                    </div>
                </div>

                <div className="success-card">
                    <div className="success-icon-wrap">✓</div>
                    <h3 className="success-title">Pembayaran Berhasil & Slot Terkonfirmasi!</h3>
                    <p className="success-desc">
                        Selamat! Jadwal bermain Anda telah resmi terdaftar dalam sistem. E-Ticket digital dengan QR Code check-in siap digunakan saat tiba di GOR.
                    </p>

                    <div className="success-summary-box">
                        <div className="checkout-item-row">
                            <span>Kode Booking (Order ID)</span>
                            <strong style={{ fontFamily: "monospace", color: "var(--accent)" }}>{paidOrder.order_id}</strong>
                        </div>
                        <div className="checkout-item-row">
                            <span>Lapangan</span>
                            <strong>{selectedCourt?.name}</strong>
                        </div>
                        <div className="checkout-item-row">
                            <span>Jadwal Bermain</span>
                            <strong>{date} • Pukul {String(hour).padStart(2, "0")}:00 - {String(endHour).padStart(2, "0")}:00 WIB ({duration} Jam)</strong>
                        </div>
                        <div className="checkout-item-row" style={{ borderBottom: "none" }}>
                            <span>Status Pembayaran</span>
                            <strong style={{ color: "#16a34a", fontSize: "1.05rem" }}>✓ LUNAS (Midtrans Snap)</strong>
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
                        {onViewMyBookings && (
                            <button
                                type="button"
                                className="btn btn-primary"
                                style={{ padding: "0.65rem 1.4rem", fontWeight: 800 }}
                                onClick={() => {
                                    resetToNewBooking();
                                    onViewMyBookings();
                                }}
                            >
                                🎫 Buka E-Ticket di Booking Saya
                            </button>
                        )}
                        <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: "0.65rem 1.4rem" }}
                            onClick={resetToNewBooking}
                        >
                            🏸 Pesan Jadwal Lain
                        </button>
                    </div>
                </div>

                {toast && (
                    <div className="toast-container" role="status" aria-live="polite">
                        <div className={`toast-message ${toast.type}`}>
                            <span>{toast.type === "success" ? "✅" : toast.type === "warning" ? "⚠️" : "⚡"}</span>
                            <span>{toast.message}</span>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // =========================================================================
    // TAMPILAN 2: TAHAP CHECKOUT & PEMBAYARAN (STATE: PENDING ORDER)
    // =========================================================================
    if (pendingOrder) {
        return (
            <div className="card checkout-view">
                {/* Stepper: Step 1 ✓, Step 2 ✓, Step 3 Active */}
                <div className="booking-stepper" aria-label="Alur Pemesanan Lapangan">
                    <div className="stepper-step completed">
                        <div className="stepper-number">✓</div>
                        <span className="stepper-title">1. Pilih Lapangan</span>
                    </div>
                    <div className="stepper-line completed"></div>
                    <div className="stepper-step completed">
                        <div className="stepper-number">✓</div>
                        <span className="stepper-title">2. Pilih Jadwal & Jam</span>
                    </div>
                    <div className="stepper-line"></div>
                    <div className="stepper-step active">
                        <div className="stepper-number">3</div>
                        <span className="stepper-title">3. Pembayaran</span>
                    </div>
                </div>

                <div className="checkout-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
                        <div>
                            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.25rem" }}>
                                Konfirmasi & Selesaikan Pembayaran
                            </h3>
                            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                                Slot lapangan Anda telah diamankan sementara. Silakan selesaikan pembayaran untuk menerbitkan E-Ticket.
                            </p>
                        </div>
                        <span className="checkout-badge-status">
                            ⏳ Menunggu Pembayaran
                        </span>
                    </div>

                    <div className="checkout-item-row">
                        <span>Kode Booking (Order ID)</span>
                        <strong style={{ fontFamily: "monospace", color: "var(--accent)" }}>{pendingOrder.order_id}</strong>
                    </div>
                    <div className="checkout-item-row">
                        <span>Lapangan</span>
                        <strong>{selectedCourt?.name}</strong>
                    </div>
                    <div className="checkout-item-row">
                        <span>Tanggal & Jam Main</span>
                        <strong>{date} • Pukul {String(hour).padStart(2, "0")}:00 - {String(endHour).padStart(2, "0")}:00 WIB</strong>
                    </div>
                    <div className="checkout-item-row">
                        <span>Durasi Sewa</span>
                        <strong>{duration} Jam</strong>
                    </div>

                    <div className="checkout-total-box">
                        <div>
                            <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>Total yang Harus Dibayar:</div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Termasuk PPN & Biaya E-Ticket Resmi</div>
                        </div>
                        <div className="checkout-total-val">
                            Rp {pendingOrder.total_price.toLocaleString("id-ID")}
                        </div>
                    </div>

                    {/* Simulasi Pembayaran Midtrans Snap */}
                    <div className="simulation-box">
                        <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#1e40af", marginBottom: "0.35rem" }}>
                            🛡️ Midtrans Snap Payment Gateway
                        </div>
                        <p style={{ fontSize: "0.82rem", color: "#475569", marginBottom: "1rem" }}>
                            Simulasi pembayaran instan untuk keperluan uji coba dan evaluasi portofolio.
                        </p>

                        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
                            <button
                                type="button"
                                className="btn btn-primary"
                                style={{ padding: "0.7rem 1.5rem", fontSize: "0.95rem", fontWeight: 800 }}
                                disabled={loading}
                                onClick={() => triggerSimulatedPayment(pendingOrder.order_id)}
                            >
                                {loading ? "Memproses Pembayaran..." : "⚡ Bayar Sekarang (Simulasi Lunas)"}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: "0.7rem 1.25rem", fontSize: "0.9rem" }}
                                disabled={loading}
                                onClick={() => {
                                    setPendingOrder(null);
                                    showToast("Pesanan dibatalkan. Silakan pilih jadwal lain.", "info");
                                }}
                            >
                                ← Batalkan & Pilih Jadwal Lain
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="alert alert-danger" style={{ marginTop: "1rem" }}>
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {toast && (
                    <div className="toast-container" role="status" aria-live="polite">
                        <div className={`toast-message ${toast.type}`}>
                            <span>{toast.type === "success" ? "✅" : toast.type === "warning" ? "⚠️" : "⚡"}</span>
                            <span>{toast.message}</span>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // =========================================================================
    // TAMPILAN 3: FORMULIR PEMILIHAN JADWAL LAPANGAN (STATE: SELECTING)
    // =========================================================================
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

            {/* Stepper Progress Indicator */}
            <div className="booking-stepper" aria-label="Alur Pemesanan Lapangan">
                <div className={`stepper-step ${selectedCourt ? "completed" : "active"}`}>
                    <div className="stepper-number">{selectedCourt ? "✓" : "1"}</div>
                    <span className="stepper-title">1. Pilih Lapangan</span>
                </div>
                <div className={`stepper-line ${date && hour ? "completed" : ""}`}></div>
                <div className={`stepper-step ${date && hour ? "completed" : "active"}`}>
                    <div className="stepper-number">{date && hour ? "✓" : "2"}</div>
                    <span className="stepper-title">2. Pilih Jadwal & Jam</span>
                </div>
                <div className="stepper-line"></div>
                <div className="stepper-step">
                    <div className="stepper-number">3</div>
                    <span className="stepper-title">3. Pembayaran</span>
                </div>
            </div>

            <form onSubmit={submit}>
                {/* Langkah 1: Pilih Lapangan Mewah dengan Fasilitas Lengkap */}
                <div className="form-group">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <label className="form-label" style={{ margin: 0 }}>
                            Langkah 1: Pilih Lapangan
                        </label>
                        <span style={{ fontSize: "0.78rem", color: "var(--accent)", fontWeight: 700 }}>
                            {courts.length} Lapangan Siap Digunakan
                        </span>
                    </div>

                    <div className="court-grid">
                        {courts.map((c) => {
                            const isSelected = c.id === selectedId;
                            const badges = getCourtBadges(c.name);

                            return (
                                <div
                                    key={c.id}
                                    className={`court-card ${isSelected ? "selected" : ""}`}
                                    onClick={() => {
                                        setCourtId(c.id);
                                        showToast(`${c.name} dipilih`);
                                    }}
                                >
                                    <div className="court-header">
                                        <div className="court-name">{c.name}</div>
                                        {isSelected && (
                                            <span className="court-badge-selected">✓ Dipilih</span>
                                        )}
                                    </div>
                                    <div className="court-price">
                                        Rp {c.price_per_hour.toLocaleString("id-ID")}{" "}
                                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "normal" }}>
                                            / jam
                                        </span>
                                    </div>

                                    {/* Fasilitas Spesifik Lapangan */}
                                    <div className="court-tag-list">
                                        {badges.map((badge, idx) => (
                                            <span key={idx} className="court-tag">
                                                {badge}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Langkah 2: Pilih Tanggal & Durasi Pill */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem", marginBottom: "1rem" }}>
                    {/* Tanggal Main */}
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Langkah 2: Tanggal Main</label>
                        <input
                            type="date"
                            min={today}
                            value={date}
                            onChange={(e) => {
                                setDate(e.target.value);
                                showToast(`Tanggal: ${e.target.value}`);
                            }}
                            required
                        />
                        <div className="date-quick-bar">
                            <button
                                type="button"
                                className={`btn-chip ${date === today ? "active" : ""}`}
                                onClick={() => {
                                    setDate(today);
                                    showToast("Tanggal: Hari Ini");
                                }}
                            >
                                Hari Ini
                            </button>
                            <button
                                type="button"
                                className={`btn-chip ${date === tomorrow ? "active" : ""}`}
                                onClick={() => {
                                    setDate(tomorrow);
                                    showToast("Tanggal: Besok");
                                }}
                            >
                                Besok
                            </button>
                            <button
                                type="button"
                                className={`btn-chip ${date === dayAfter ? "active" : ""}`}
                                onClick={() => {
                                    setDate(dayAfter);
                                    showToast("Tanggal: Lusa");
                                }}
                            >
                                Lusa
                            </button>
                        </div>
                    </div>

                    {/* Durasi Main (Model Tombol Pill yang Nyaman) */}
                    <div className="form-group" style={{ margin: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem" }}>
                            <label className="form-label" style={{ margin: 0 }}>
                                Durasi Bermain
                            </label>
                            <span style={{ fontSize: "0.8rem", color: "var(--accent)", fontWeight: 700 }}>
                                Selesai: {String(endHour).padStart(2, "0")}:00 WIB
                            </span>
                        </div>

                        <div className="duration-pill-group">
                            {[
                                { h: 1, label: "1 Jam", sub: "Pemanasan" },
                                { h: 2, label: "2 Jam", sub: "Populer 🔥" },
                                { h: 3, label: "3 Jam", sub: "Turnamen" },
                            ].map((item) => (
                                <button
                                    key={item.h}
                                    type="button"
                                    className={`duration-pill-btn ${duration === item.h ? "active" : ""}`}
                                    onClick={() => {
                                        setDuration(item.h);
                                        showToast(`Durasi: ${item.label}`);
                                    }}
                                >
                                    <span className="duration-pill-label">{item.label}</span>
                                    <span className="duration-pill-sub">{item.sub}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Langkah 3: Pengelompokan Slot Jam (Pagi, Siang/Sore, Malam Prime-Time) */}
                <div className="slots-container">
                    <div className="slot-grid-header">
                        <div>
                            <label className="form-label" style={{ margin: 0, fontSize: "0.95rem" }}>
                                Langkah 3: Pilih Jam Mulai Main
                            </label>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                Jam operasional 07:00 - 22:00 WIB (Pilih jam mulai bermain)
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

                    {loadingSlots ? (
                        <div className="time-slot-grid">
                            {OPERATING_HOURS.map((h) => (
                                <div key={h} className="skeleton-shimmer skeleton-slot" />
                            ))}
                        </div>
                    ) : (
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
                                        onClick={() => {
                                            setHour(h);
                                            showToast(`Mulai jam ${String(h).padStart(2, "0")}:00 dipilih (${duration} Jam)`);
                                        }}
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
                    )}
                </div>

                {/* Notifikasi Error & Bentrok Waktu Pemilihan */}
                {hasCollision && (
                    <div className="alert alert-danger">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span>
                            <strong>Slot Bertabrakan!</strong> Jam {String(hour).padStart(2, "0")}:00 s/d {String(endHour).padStart(2, "0")}:00 sudah terisi. Silakan pilih jam atau durasi lain.
                        </span>
                    </div>
                )}

                {isPastClosing && (
                    <div className="alert alert-danger">
                        <span>Jam selesai ({String(endHour).padStart(2, "0")}:00) melewati jam tutup operasional arena (22:00 WIB).</span>
                    </div>
                )}

                {error && (
                    <div className="alert alert-danger">
                        <span>{error}</span>
                    </div>
                )}

                {/* Langkah 4: Rincian Biaya Model Struk Transparan */}
                <div className="receipt-card">
                    <div className="receipt-header">
                        <div className="receipt-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                            </svg>
                            Rincian Estimasi Pesanan
                        </div>
                        <span className="receipt-badge-guarantee">🛡️ Bebas Double Booking</span>
                    </div>

                    <div className="receipt-row">
                        <span>Sewa Lapangan ({selectedCourt?.name})</span>
                        <strong>Rp {((selectedCourt?.price_per_hour ?? 0) * duration).toLocaleString("id-ID")}</strong>
                    </div>

                    <div className="receipt-row">
                        <span>Jadwal & Durasi Main</span>
                        <span>
                            {date} • Pukul {String(hour).padStart(2, "0")}:00 - {String(endHour).padStart(2, "0")}:00 ({duration} Jam)
                        </span>
                    </div>

                    <div className="receipt-row">
                        <span>Biaya Layanan & Pajak</span>
                        <span style={{ color: "#16a34a", fontWeight: 700 }}>Gratis (Rp 0)</span>
                    </div>

                    <div className="receipt-divider"></div>

                    <div className="receipt-total-row">
                        <div>
                            <div className="receipt-total-label">Total Pembayaran</div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Termasuk PPN & E-Ticket Resmi</div>
                        </div>
                        <div className="receipt-total-val">
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
                            ? "Memproses Pemesanan..."
                            : isLoggedIn
                            ? "🔒 Lanjut ke Pembayaran (Midtrans)"
                            : "Pesan Sekarang (Masuk untuk Menyelesaikan)"}
                    </button>
                    {!isLoggedIn && (
                        <p style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.6rem" }}>
                            Belum punya akun? Anda bisa daftar gratis hanya dalam hitungan detik.
                        </p>
                    )}
                </div>
            </form>

            {/* Sticky Mobile Booking Bar (Hanya tampil saat memilih slot di HP) */}
            <div className="sticky-mobile-bar" aria-label="Ringkasan Cepat Pesanan">
                <div className="sticky-mobile-info">
                    <span className="sticky-mobile-court">{selectedCourt?.name} • {duration} Jam</span>
                    <span className="sticky-mobile-price">Rp {((selectedCourt?.price_per_hour ?? 0) * duration).toLocaleString("id-ID")}</span>
                </div>
                <button
                    type="button"
                    className="sticky-mobile-btn"
                    onClick={() => {
                        const el = document.querySelector(".receipt-card");
                        el?.scrollIntoView({ behavior: "smooth" });
                    }}
                >
                    Lihat Struk ➜
                </button>
            </div>

            {/* Floating Toast Notification */}
            {toast && (
                <div className="toast-container" role="status" aria-live="polite">
                    <div className={`toast-message ${toast.type}`}>
                        <span>{toast.type === "success" ? "✅" : toast.type === "warning" ? "⚠️" : "⚡"}</span>
                        <span>{toast.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
