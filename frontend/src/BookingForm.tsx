import { useEffect, useState, type FormEvent } from "react";
import { api } from "./api";

type Court = { id: number; name: string; price_per_hour: number };
type Slot = { id: number; start_time: string; end_time: string };

const START_HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00 - 22:00

function todayStr() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
}

const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

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
    const [date, setDate] = useState(todayStr());
    const [hour, setHour] = useState(18);
    const [duration, setDuration] = useState(1);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const selectedId = courtId ?? courts[0]?.id;
    const court = courts.find((c) => c.id === selectedId);

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

    async function submit(e: FormEvent) {
        e.preventDefault();
        if (!selectedId) return;
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
            setMessage("Booking berhasil!");
            onBooked();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
            setLoading(false);
        }
    }

    const field = { display: "block", width: "100%", padding: 8, marginBottom: 8 };

    if (courts.length === 0) return <p>Belum ada lapangan.</p>;

    return (
        <form onSubmit={submit} style={{ marginBottom: "2rem" }}>
            <h2>Pesan Lapangan</h2>

            <select style={field} value={selectedId} onChange={(e) => setCourtId(Number(e.target.value))}>
                {courts.map((c) => (
                    <option key={c.id} value={c.id}>
                        {c.name}
                    </option>
                ))}
            </select>

            <input style={field} type="date" min={todayStr()} value={date} onChange={(e) => setDate(e.target.value)} required />

            <select style={field} value={hour} onChange={(e) => setHour(Number(e.target.value))}>
                {START_HOURS.map((h) => (
                    <option key={h} value={h}>
                        Mulai {String(h).padStart(2, "0")}:00
                    </option>
                ))}
            </select>

            <select style={field} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {[1, 2, 3].map((d) => (
                    <option key={d} value={d}>
                        {d} jam
                    </option>
                ))}
            </select>

            <h3>Slot terisi pada tanggal ini</h3>
            {slots.length === 0 ? (
                <p>Belum ada booking, semua jam masih kosong.</p>
            ) : (
                <ul>
                    {slots.map((s) => (
                        <li key={s.id}>
                            {fmtTime(s.start_time)} - {fmtTime(s.end_time)}
                        </li>
                    ))}
                </ul>
            )}

            {court && (
                <p>
                    Total: Rp {(court.price_per_hour * duration).toLocaleString("id-ID")}
                </p>
            )}
            {error && <p style={{ color: "#f87171" }}>{error}</p>}
            {message && <p style={{ color: "#4ade80" }}>{message}</p>}
            <button type="submit" disabled={loading}>
                {loading ? "Memproses..." : "Pesan sekarang"}
            </button>
        </form>
    );
}