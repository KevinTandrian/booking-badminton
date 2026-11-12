import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import AuthForm from "./AuthForm";
import BookingForm from "./BookingForm";
import MyBookings from "./MyBookings";
import AdminPanel from "./AdminPanel";
import heroImage from "./assets/heroimage.jpg";

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

      {/* Banner Utama Besar (Big Landscape Hero Banner) */}
      <section className="hero-banner-main">
        <img
          src={heroImage}
          alt="Arena Lapangan Bulutangkis SmashPoint"
          className="hero-banner-bg"
          loading="eager"
        />
        <div className="hero-banner-overlay"></div>
        <div className="hero-banner-content">
          <div className="hero-pill-glass">
            <span className="pulse-dot"></span>
            <span>Buka Setiap Hari: 07:00 - 22:00 WIB</span>
          </div>

          <h1 className="hero-banner-title">
            Sewa Lapangan Bulutangkis Jadi Lebih Mudah
          </h1>

          <p className="hero-banner-desc">
            Cek ketersediaan jadwal secara langsung, pilih jam main favorit Anda, dan nikmati sistem pemesanan anti-bentrok secara real-time.
          </p>

          <div className="hero-banner-features">
            <div className="hero-feature-glass">
              <span className="feature-check">✓</span> Bebas Double Booking
            </div>
            <div className="hero-feature-glass">
              <span className="feature-check">✓</span> Karpet Biru Standar BWF / PBSI
            </div>
            <div className="hero-feature-glass">
              <span className="feature-check">✓</span> Konfirmasi Instan & E-Ticket
            </div>
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

      {/* Modern Footer */}
      <footer className="app-footer">
        <div className="footer-grid">
          <div>
            <div className="footer-title">
              <span>🏸</span> SmashPoint Arena
            </div>
            <p className="footer-desc">
              GOR Bulutangkis modern dengan karpet vinyl standar PBSI & BWF. Nikmati kemudahan reservasi online instan, transparan, dan anti double-booking secara real-time.
            </p>
            <a
              href="https://wa.me/6281234567890?text=Halo%20Admin%20SmashPoint%20Arena,%20saya%20ingin%20tanya%20jadwal"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-btn-wa"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.697c.983.541 1.871.829 2.806.829h.005c3.182 0 5.767-2.587 5.768-5.766 0-3.18-2.586-5.766-5.773-5.766zm8.81 5.767c-.004 4.867-3.96 8.821-8.82 8.821-1.503 0-2.915-.38-4.148-1.045l-4.57 1.2 1.22-4.457c-.742-1.291-1.171-2.779-1.171-4.364 0-4.867 3.96-8.821 8.82-8.821 4.868 0 8.899 3.954 8.899 8.666z"/>
              </svg>
              Chat WhatsApp CS
            </a>
          </div>

          <div>
            <div className="footer-title">
              <span>⚡</span> Fasilitas Arena
            </div>
            <ul className="footer-list">
              <li><span>🅿️</span> Parkir Luas & Gratis (Mobil/Motor)</li>
              <li><span>🥤</span> Kantin, Minuman Dingin & Snack</li>
              <li><span>🚿</span> Ruang Ganti & Kamar Mandi Bersih</li>
              <li><span>🕌</span> Mushola Nyaman & Ber-AC</li>
              <li><span>🏸</span> Sewa Raket & Penjualan Shuttlecock</li>
            </ul>
          </div>

          <div>
            <div className="footer-title">
              <span>📍</span> Lokasi & Operasional
            </div>
            <ul className="footer-list">
              <li><span>🕒</span> <strong>07.00 - 22.00 WIB</strong> (Setiap Hari)</li>
              <li><span>🏢</span> Jl. Arena Juara No. 88, Sport Center</li>
              <li><span>📞</span> (021) 555-8899 / WhatsApp CS</li>
              <li><span>💳</span> Pembayaran: QRIS, GoPay, VA BCA, Mandiri</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div>
            © {new Date().getFullYear()} <strong>SmashPoint Arena</strong>. Dibuat untuk Portofolio Sistem Reservasi Modern.
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", background: "#f1f5f9", padding: "0.2rem 0.5rem", borderRadius: "6px", color: "#475569" }}>
              ⚡ PostgreSQL GiST Anti-Collision
            </span>
            <span style={{ fontSize: "0.75rem", background: "#eff6ff", padding: "0.2rem 0.5rem", borderRadius: "6px", color: "var(--accent)", fontWeight: 600 }}>
              🛡️ Midtrans Secured
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
