import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import AuthForm from "./AuthForm";
import BookingForm from "./BookingForm";
import MyBookings from "./MyBookings";
import AdminPanel from "./AdminPanel";

type Court = { id: number; name: string; price_per_hour: number };

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
  const [activeTab, setActiveTab] = useState<"book" | "my-bookings" | "admin">("book");

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
    <div className="app-container">
      {/* Header Bar */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a4 4 0 0 0-4 4c0 3 4 8 4 8s4-5 4-8a4 4 0 0 0-4-4z"></path>
              <circle cx="12" cy="6" r="1.5"></circle>
              <path d="M7 16l-3 5h16l-3-5"></path>
              <line x1="8" y1="21" x2="16" y2="21"></line>
            </svg>
          </div>
          <div>
            <div className="brand-title">SmashPoint Arena</div>
            <div className="brand-subtitle">Badminton Court Reservation</div>
          </div>
        </div>

        {loggedIn && (
          <div className="user-nav">
            <span className={`role-badge ${role === "admin" ? "admin" : "customer"}`}>
              {role === "admin" ? "Admin" : "Member"}
            </span>
            <button type="button" className="btn btn-secondary" style={{ padding: "0.4rem 0.85rem", fontSize: "0.85rem" }} onClick={logout}>
              Keluar
            </button>
          </div>
        )}
      </header>

      {error && (
        <div className="alert alert-danger">
          <span>{error}</span>
        </div>
      )}

      {loggedIn ? (
        <>
          {/* Navigasi Tab */}
          <div className="nav-tabs">
            <button
              type="button"
              className={`tab-btn ${activeTab === "book" ? "active" : ""}`}
              onClick={() => setActiveTab("book")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Pesan Lapangan
            </button>

            <button
              type="button"
              className={`tab-btn ${activeTab === "my-bookings" ? "active" : ""}`}
              onClick={() => setActiveTab("my-bookings")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              Booking Saya
            </button>

            {role === "admin" && (
              <button
                type="button"
                className={`tab-btn ${activeTab === "admin" ? "active" : ""}`}
                onClick={() => setActiveTab("admin")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                Kelola Lapangan
              </button>
            )}
          </div>

          {/* Konten Tab */}
          {activeTab === "book" && (
            <BookingForm courts={courts} refreshKey={refreshKey} onBooked={refresh} />
          )}

          {activeTab === "my-bookings" && (
            <MyBookings refreshKey={refreshKey} onChange={refresh} />
          )}

          {activeTab === "admin" && role === "admin" && (
            <AdminPanel courts={courts} onChanged={loadCourts} />
          )}
        </>
      ) : (
        <>
          {/* Hero Banner Publik */}
          <div className="hero-banner">
            <h1>Booking Lapangan Bulutangkis</h1>
            <p>
              Pesan lapangan favorit Anda dengan jadwal real-time yang terjamin bebas double-booking.
            </p>
          </div>

          {/* Form Login / Register */}
          <AuthForm onLogin={() => setRole(getRole())} />

          {/* Katalog Lapangan Publik */}
          <div className="card">
            <h2 className="card-title">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              Daftar Lapangan Tersedia
            </h2>
            <div className="court-grid">
              {courts.map((c) => (
                <div key={c.id} className="court-card" style={{ cursor: "default" }}>
                  <div className="court-name">
                    <span>{c.name}</span>
                    <span style={{ fontSize: "0.75rem", background: "var(--success-bg)", color: "var(--accent)", padding: "0.2rem 0.5rem", borderRadius: "999px" }}>
                      Siap Pakai
                    </span>
                  </div>
                  <div className="court-price">
                    Rp {c.price_per_hour.toLocaleString("id-ID")} <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>/ jam</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: "1rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Silakan <strong>Masuk</strong> atau <strong>Daftar Akun</strong> di atas untuk mulai memesan slot jadwal.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
