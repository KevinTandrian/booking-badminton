import { useEffect, useState } from "react";
import { api } from "./api";
import AuthForm from "./AuthForm";
import BookingForm from "./BookingForm";
import MyBookings from "./MyBookings";

type Court = { id: number; name: string; price_per_hour: number };

export default function App() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [error, setError] = useState("");
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem("token"));
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    api<Court[]>("/courts")
      .then(setCourts)
      .catch((e) => setError(e.message));
  }, []);

  function logout() {
    localStorage.removeItem("token");
    setLoggedIn(false);
  }

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Booking Lapangan Bulutangkis</h1>

      {error && <p style={{ color: "#f87171" }}>{error}</p>}

      {loggedIn ? (
        <>
          <p>
            Kamu sudah masuk. <button onClick={logout}>Keluar</button>
          </p>
          <BookingForm courts={courts} refreshKey={refreshKey} onBooked={refresh} />
          <MyBookings refreshKey={refreshKey} onChange={refresh} />
        </>
      ) : (
        <>
          <AuthForm onLogin={() => setLoggedIn(true)} />
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