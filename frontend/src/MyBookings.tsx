import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

type Booking = {
    id: number;
    court_name: string;
    start_time: string;
    end_time: string;
    status: string;
};

const fmt = (iso: string) =>
    new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

export default function MyBookings({
    refreshKey,
    onChange,
}: {
    refreshKey: number;
    onChange: () => void;
}) {
    const [items, setItems] = useState<Booking[]>([]);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        try {
            setItems(await api<Booking[]>("/bookings/me"));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Terjadi kesalahan");
        }
    }, []);

    useEffect(() => {
        load();
    }, [load, refreshKey]);

    async function cancel(id: number) {
        setError("");
        try {
            await api(`/bookings/${id}/cancel`, { method: "PATCH" });
            onChange();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Terjadi kesalahan");
        }
    }

    return (
        <div>
            <h2>Booking Saya</h2>
            {error && <p style={{ color: "#f87171" }}>{error}</p>}
            {items.length === 0 ? (
                <p>Belum ada booking.</p>
            ) : (
                <ul>
                    {items.map((b) => (
                        <li key={b.id} style={{ marginBottom: 8 }}>
                            {b.court_name}, {fmt(b.start_time)} - {fmt(b.end_time)} ({b.status}){" "}
                            {b.status === "confirmed" && (
                                <button onClick={() => cancel(b.id)}>Batalkan</button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}