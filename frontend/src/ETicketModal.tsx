type Booking = {
    id: number;
    court_name: string;
    start_time: string;
    end_time: string;
    status: string;
    order_id?: string;
    total_price?: number;
    payment_status?: string;
};

const fmtFullDate = (iso: string) =>
    new Date(iso).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

export default function ETicketModal({
    booking,
    onClose,
}: {
    booking: Booking;
    onClose: () => void;
}) {
    const orderId = booking.order_id ?? `BOOK-${booking.id}-${Date.now().toString().slice(-4)}`;
    const qrData = `SMASHPOINT-VERIFY:${orderId}:${booking.court_name}:${booking.start_time}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData)}&color=0f172a&bgcolor=ffffff`;

    function handlePrint() {
        window.print();
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content ticket-modal-wrapper"
                style={{ maxWidth: 520, padding: 0, overflow: "hidden", borderRadius: 20 }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Bagian Tiket yang akan dicetak */}
                <div id="printable-ticket" className="eticket-container">
                    {/* Header Tiket */}
                    <div className="eticket-header">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            <div className="brand-icon" style={{ width: 36, height: 36, borderRadius: 10 }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                    <path d="M12 2a4 4 0 0 0-4 4c0 3 4 8 4 8s4-5 4-8a4 4 0 0 0-4-4z"></path>
                                    <circle cx="12" cy="6" r="1.5"></circle>
                                    <path d="M7 16l-3 5h16l-3-5"></path>
                                    <line x1="8" y1="21" x2="16" y2="21"></line>
                                </svg>
                            </div>
                            <div>
                                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>
                                    SmashPoint Arena
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "#bbf7d0", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                                    E-Ticket & Bukti Reservasi Resmi
                                </div>
                            </div>
                        </div>

                        <span style={{ background: "#ffffff", color: "#166534", padding: "0.25rem 0.65rem", borderRadius: 999, fontSize: "0.75rem", fontWeight: 800 }}>
                            ✓ LUNAS
                        </span>
                    </div>

                    {/* Badan Tiket */}
                    <div className="eticket-body">
                        {/* Order ID & Barcode Visual */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", borderBottom: "1px dashed #cbd5e1", paddingBottom: "1rem" }}>
                            <div>
                                <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                                    Kode Booking (Order ID)
                                </div>
                                <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", fontFamily: "monospace" }}>
                                    {orderId}
                                </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                                    Metode Pembayaran
                                </div>
                                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#16a34a" }}>
                                    Midtrans QRIS / VA
                                </div>
                            </div>
                        </div>

                        {/* Rincian Lapangan & Jadwal */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                            <div>
                                <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                                    Lapangan
                                </div>
                                <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
                                    {booking.court_name}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                    Karpet Vinyl Standar PBSI
                                </div>
                            </div>

                            <div>
                                <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                                    Total Tarif
                                </div>
                                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#16a34a" }}>
                                    Rp {(booking.total_price ?? 0).toLocaleString("id-ID")}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "#166534", fontWeight: 600 }}>
                                    Pembayaran Lunas
                                </div>
                            </div>

                            <div style={{ gridColumn: "span 2" }}>
                                <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                                    Jadwal Bermain
                                </div>
                                <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
                                    {fmtFullDate(booking.start_time)}
                                </div>
                                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#16a34a", marginTop: "0.15rem" }}>
                                    Pukul {fmtTime(booking.start_time)} - {fmtTime(booking.end_time)} WIB
                                </div>
                            </div>
                        </div>

                        {/* Box QR Code Check-in */}
                        <div className="eticket-qr-box">
                            <img
                                src={qrUrl}
                                alt="QR Code Verifikasi"
                                width="150"
                                height="150"
                                style={{ borderRadius: 8, display: "block", margin: "0 auto 0.6rem" }}
                            />
                            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0f172a" }}>
                                Scan QR Code ini untuk Check-in di Kasir GOR
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                Tunjukkan tiket ini kepada petugas saat kedatangan di lapangan.
                            </div>
                        </div>

                        {/* Catatan Penting */}
                        <div style={{ background: "#f8fafc", padding: "0.75rem 1rem", borderRadius: 10, fontSize: "0.75rem", color: "#475569", lineHeight: 1.4, marginTop: "1rem" }}>
                            <strong>Ketentuan Arena:</strong> Wajib mengenakan sepatu olahraga khusus bulutangkis (non-marking sole). Harap hadir 10 menit sebelum jam main.
                        </div>
                    </div>
                </div>

                {/* Tombol Aksi di Modal (Tidak ikut tercetak saat diprint) */}
                <div className="eticket-actions-bar no-print">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Tutup
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handlePrint}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <polyline points="6 9 6 2 18 2 18 9"></polyline>
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                            <rect x="6" y="14" width="12" height="8"></rect>
                        </svg>
                        Cetak / Simpan PDF
                    </button>
                </div>
            </div>
        </div>
    );
}

