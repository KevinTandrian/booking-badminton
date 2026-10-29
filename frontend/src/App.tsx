import { useEffect, useState } from "react";
import { api } from "./api";
import AuthForm from "./AuthForm";

type Court = { id: number; name: string; price_per_hour: number };

export default function App() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [error, setError] = useState("");
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem("token"));

  useEffect(() => {
    api<Court[]>("/courts")
      .then(setCourts)
      .catch((e) => setError(e.message));
  }, []);

  function logout() {
    localStorage.removeItem("token");
    setLoggedIn(false);
  }

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Booking Lapangan Bulutangkis</h1>

      {loggedIn ? (
        <p>
          Kamu sudah masuk. <button onClick={logout}>Keluar</button>
        </p>
      ) : (
        <AuthForm onLogin={() => setLoggedIn(true)} />
      )}

      <h2>Daftar Lapangan</h2>
      {error && <p style={{ color: "#f87171" }}>{error}</p>}
      <ul>
        {courts.map((c) => (
          <li key={c.id}>
            {c.name}: Rp {c.price_per_hour.toLocaleString("id-ID")}/jam
          </li>
        ))}
      </ul>
    </div>
  );
}