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
  const [showAuthModal, setShowAuthModal] = useState(false);

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
    setActiveTab("book");
  }

  function handleLoginSuccess() {
    setRole(getRole());
    setShowAuthModal(false);
  }

  const refresh = () => setRefreshKey((k) => k + 1);
  const loggedIn = role !== null;

  return (
    <div className="app-container">
      {/* Header Bar */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a4 4 0 0 0-4 4c0 3 4 8 4 8s4-5 4-8a4 4 0 0 0-4-4z"></path>
              <circle cx="12" cy="6" r="1.5"></circle>
              <path d="M7 16l-3 5h16l-3-5"></path>
              <line x1="8" y1="21" x2="16" y2="21"></line>
            </svg>
          </div>
          <div>
            <div className="brand-title">SmashPoint Arena</div>
            <div className="brand-subtitle">Reservasi Lapangan Bulutangkis Resmi</div>
          </div>
        </div>

        <div className="user-nav">
          {loggedIn ? (
            <>
              <span className={`role-badge ${role === "admin" ? "admin" : "customer"}`}>
                {role === "admin" ? "Administrator" : "Member"}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "0.45rem 0.95rem", fontSize: "0.85rem" }}
                onClick={logout}
              >
                Keluar
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: "0.5rem 1.1rem", fontSize: "0.9rem" }}
              onClick={() => setShowAuthModal(true)}
            >
              Masuk / Daftar
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="alert alert-danger">
          <span>{error}</span>
        </div>
      )}

      {/* Hero Section Bersih & Ramah */}
      <section className="hero-section">
        <div className="hero-pill">
          <span>✨ Buka Setiap Hari: 07:00 - 22:00 WIB</span>
        </div>
        <h1>Sewa Lapangan Bulutangkis Jadi Lebih Mudah</h1>
        <p>
          Cek ketersediaan jadwal secara langsung, pilih jam main favorit Anda, dan nikmati sistem pemesanan anti-bentrok secara real-time.
        </p>

        <div className="hero-features">
          <div className="hero-feature-item">
            <span style={{ color: "var(--accent)" }}>✓</span> Bebas Double Booking
          </div>
          <div className="hero-feature-item">
            <span style={{ color: "var(--accent)" }}>✓</span> Karpet Vinyl Standar PBSI
          </div>
          <div className="hero-feature-item">
            <span style={{ color: "var(--accent)" }}>✓</span> Parkir Luas & Kantin
          </div>
        </div>
      </section>

      {/* Navigasi Tab */}
      <div className="nav-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === "book" ? "active" : ""}`}
          onClick={() => setActiveTab("book")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          Pesan Lapangan
        </button>

        {loggedIn && (
          <button
            type="button"
            className={`tab-btn ${activeTab === "my-bookings" ? "active" : ""}`}
            onClick={() => setActiveTab("my-bookings")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            Booking Saya
          </button>
        )}

        {loggedIn && role === "admin" && (
          <button
            type="button"
            className={`tab-btn ${activeTab === "admin" ? "active" : ""}`}
            onClick={() => setActiveTab("admin")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Kelola Lapangan
          </button>
        )}
      </div>

      {/* Konten Halaman */}
      {activeTab === "book" && (
        <BookingForm
          courts={courts}
          refreshKey={refreshKey}
          onBooked={refresh}
          isLoggedIn={loggedIn}
          onRequestLogin={() => setShowAuthModal(true)}
        />
      )}

      {activeTab === "my-bookings" && loggedIn && (
        <MyBookings refreshKey={refreshKey} onChange={refresh} />
      )}

      {activeTab === "admin" && loggedIn && role === "admin" && (
        <AdminPanel courts={courts} onChanged={loadCourts} />
      )}

      {/* Pop-up Modal Masuk / Daftar */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setShowAuthModal(false)}
              aria-label="Tutup"
            >
              &times;
            </button>
            <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a" }}>
                Masuk ke Akun Anda
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Tinggal 1 langkah lagi untuk menyelesaikan pesanan lapangan Anda.
              </p>
            </div>
            <AuthForm onLogin={handleLoginSuccess} />
          </div>
        </div>
      )}
    </div>
  );
}
