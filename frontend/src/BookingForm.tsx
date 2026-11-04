import { useEffect, useState, type FormEvent } from "react";
import { api } from "./api";

type Court = { id: number; name: string; price_per_hour: number };
type Slot = { id: number; start_time: string; end_time: string };

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
}: {
    courts: Court[];
    refreshKey: number;
    onBooked: () => void;
}) {
    const [courtId, setCourtId] = useState<number | null>(null);
    const [date, setDate] = useState(getDateString(0));
    const [hour, setHour] = useState(18);
    const [duration, setDuration] = useState(1);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

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

    // Reset notifikasi jika input berubah
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

    // Jam selesai
    const endHour = hour + duration;
    const isPastClosing = endHour > 22;

    async function submit(e: FormEvent) {
        e.preventDefault();
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
        setLoading(true);

        try {
            const start = new Date(`${date}T${String(hour).padStart(2, "0")}:00:00`);
            const end = new Date(start.getTime() + duration * 3600000);
            await api("/bookings", {
                method: "POST",
                body: JSON.stringify({
                    court_id: selectedId,
                    start_time: start.toISOString(),
                    end_time: end.toISOString(),
                }),
            });
            setMessage(`Booking berhasil untuk ${selectedCourt?.name} pada ${date} pukul ${String(hour).padStart(2, "0")}:00 - ${String(endHour).padStart(2, "0")}:00!`);
            onBooked();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memproses booking");
        } finally {
            setLoading(false);
        }
    }

    if (courts.length === 0) {
        return (
            <div className="card">
                <p style={{ color: "var(--text-muted)" }}>Belum ada lapangan aktif yang tersedia.</p>
            </div>
        );
    }

    const today = getDateString(0);
    const tomorrow = getDateString(1);

    return (
        <div className="card">
            <h2 className="card-title">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Pesan Lapangan
            </h2>

            <form onSubmit={submit}>
                {/* Pemilihan Lapangan */}
                <div className="form-group">
                    <label className="form-label">Pilih Lapangan</label>
                    <div className="court-grid">
                        {courts.map((c) => {
                            const isSelected = c.id === selectedId;
                            return (
                                <div
                                    key={c.id}
                                    className={`court-card ${isSelected ? "selected" : ""}`}
                                    onClick={() => setCourtId(c.id)}
                                >
                                    <div className="court-name">
                                        <span>{c.name}</span>
                                        {isSelected && (
                                            <span style={{ color: "var(--accent)", fontSize: "0.8rem" }}>✓ Dipilih</span>
                                        )}
                                    </div>
                                    <div className="court-price">
                                        Rp {c.price_per_hour.toLocaleString("id-ID")} <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>/ jam</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Pemilihan Tanggal & Durasi */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                    <div className="form-group">
                        <label className="form-label">Tanggal Main</label>
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
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Durasi Main</label>
                        <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                            <option value={1}>1 Jam</option>
                            <option value={2}>2 Jam</option>
                            <option value={3}>3 Jam</option>
                        </select>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: "0.4rem" }}>
                            Selesai: pukul {String(endHour).padStart(2, "0")}:00
                        </div>
                    </div>
                </div>

                {/* Visual Time-Slot Grid */}
                <div className="slots-container">
                    <div className="slot-grid-header">
                        <label className="form-label" style={{ margin: 0 }}>
                            Pilih Jam Mulai (07:00 - 22:00)
                        </label>
                        <div className="slot-legend">
                            <div className="legend-item">
                                <span className="legend-dot available"></span>
                                <span>Tersedia</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-dot selected"></span>
                                <span>Terpilih</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-dot booked"></span>
                                <span>Terisi</span>
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
                                    title={booked ? "Slot sudah dipesan" : `Pilih jam ${String(h).padStart(2, "0")}:00`}
                                >
                                    <span className="slot-time">{String(h).padStart(2, "0")}:00</span>
                                    <span className="slot-status">
                                        {booked ? "Penuh" : selected ? "Mulai" : inRange ? "Dalam Durasi" : "Kosong"}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Notifikasi Error & Sukses */}
                {hasCollision && (
                    <div className="alert alert-danger">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span>Slot bentrok! Ada jam yang sudah terisi di antara jam {String(hour).padStart(2, "0")}:00 - {String(endHour).padStart(2, "0")}:00.</span>
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
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        <span>{message}</span>
                    </div>
                )}

                {/* Ringkasan & Submit */}
                <div className="summary-box">
                    <div className="summary-details">
                        <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase" }}>Ringkasan Pesanan</div>
                        <strong>{selectedCourt?.name}</strong> • {date} ({String(hour).padStart(2, "0")}:00 - {String(endHour).padStart(2, "0")}:00, {duration} jam)
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Total Pembayaran</div>
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
                        {loading ? "Memproses Pemesanan..." : "Pesan Sekarang"}
                    </button>
                </div>
            </form>
        </div>
    );
}
