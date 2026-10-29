import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import AuthForm from "./AuthForm";
import BookingForm from "./BookingForm";
import MyBookings from "./MyBookings";
import AdminPanel from "./AdminPanel";

type Court = { id: number; name: string; price_per_hour: number };

// Hanya untuk menentukan tampilan. Pembatasan akses yang sebenarnya ada di server.
function getRole(): string | null {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)).role ?? null;
  } catch {
    return null;
  }
}

export default function App() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [error, setError] = useState("");
  const [role, setRole] = useState<string | null>(getRole());
  const [refreshKey, setRefreshKey] = useState(0);

  const loadCourts = useCallback(() => {
    api<Court[]>("/courts")
      .then(setCourts)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    loadCourts();
  }, [loadCourts]);

  function logout() {
    localStorage.removeItem("token");
    setRole(null);
  }

  const refresh = () => setRefreshKey((k) => k + 1);
  const loggedIn = role !== null;

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Booking Lapangan Bulutangkis</h1>

      {error && <p style={{ color: "#f87171" }}>{error}</p>}

      {loggedIn ? (
        <>
          <p>
            Kamu sudah masuk{role === "admin" ? " sebagai admin" : ""}.{" "}
            <button onClick={logout}>Keluar</button>
          </p>
          {role === "admin" && <AdminPanel courts={courts} onChanged={loadCourts} />}
          <BookingForm courts={courts} refreshKey={refreshKey} onBooked={refresh} />
          <MyBookings refreshKey={refreshKey} onChange={refresh} />
        </>
      ) : (
        <>
          <AuthForm onLogin={() => setRole(getRole())} />
          <h2>Daftar Lapangan</h2>
          <ul>
            {courts.map((c) => (
              <li key={c.id}>
                {c.name}: Rp {c.price_per_hour.toLocaleString("id-ID")}/jam
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}