-- Menambahkan kolom pembayaran ke tabel bookings
ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS order_id VARCHAR(100) UNIQUE,
  ADD COLUMN IF NOT EXISTS total_price INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'expired', 'failed')),
  ADD COLUMN IF NOT EXISTS snap_token VARCHAR(255);

-- Memperbarui constraint status booking agar mendukung 'pending' (sedang bayar)
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
  CHECK (status IN ('confirmed', 'cancelled', 'pending'));

-- Memperbarui GiST exclusion constraint agar slot terkunci saat status 'confirmed' MAUPUN 'pending'
-- Catatan: Jika ada booking bentrok saat ini, constraint akan memastikan integritas data.
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_court_id_tstzrange_excl'
  ) THEN
    ALTER TABLE bookings DROP CONSTRAINT bookings_court_id_tstzrange_excl;
  END IF;
END $$;

ALTER TABLE bookings ADD CONSTRAINT bookings_court_id_tstzrange_excl
  EXCLUDE USING gist (
    court_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status IN ('confirmed', 'pending'));

