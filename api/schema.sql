CREATE TABLE IF NOT EXISTS staff_users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_sessions (
  token_hash char(64) PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS staff_sessions_expiry_idx ON staff_sessions (expires_at);

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key text PRIMARY KEY,
  setting_value text NOT NULL,
  updated_by uuid REFERENCES staff_users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_settings (setting_key, setting_value)
VALUES ('price_per_kg', '8000')
ON CONFLICT (setting_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS packages (
  id uuid PRIMARY KEY,
  tracking_code text NOT NULL UNIQUE,
  recipient_name text NOT NULL,
  recipient_phone text,
  sender_name text,
  destination text NOT NULL CHECK (destination IN ('Bajawa', 'Malanuza', 'Aimere')),
  description text NOT NULL DEFAULT '',
  pcs integer NOT NULL DEFAULT 1 CHECK (pcs > 0),
  weight_kg numeric(7, 2) NOT NULL CHECK (weight_kg > 0),
  price_per_kg integer NOT NULL CHECK (price_per_kg > 0),
  total_price integer NOT NULL CHECK (total_price >= 0),
  barcode_hash char(64) NOT NULL UNIQUE,
  verified_at timestamptz,
  verified_by uuid REFERENCES staff_users(id),
  paid_at timestamptz,
  paid_by uuid REFERENCES staff_users(id),
  collected_at timestamptz,
  collected_by uuid REFERENCES staff_users(id),
  created_by uuid NOT NULL REFERENCES staff_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE packages ALTER COLUMN recipient_phone DROP NOT NULL;
ALTER TABLE packages ALTER COLUMN sender_name DROP NOT NULL;
ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS pcs integer NOT NULL DEFAULT 1 CHECK (pcs > 0);
ALTER TABLE packages ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES staff_users(id);

CREATE INDEX IF NOT EXISTS packages_created_idx ON packages (created_at DESC);
CREATE INDEX IF NOT EXISTS packages_archived_idx ON packages (archived_at, created_at DESC);
CREATE INDEX IF NOT EXISTS packages_payment_idx ON packages (paid_at, created_at DESC);

CREATE TABLE IF NOT EXISTS package_events (
  id uuid PRIMARY KEY,
  package_id uuid NOT NULL REFERENCES packages(id),
  actor_id uuid NOT NULL REFERENCES staff_users(id),
  action text NOT NULL CHECK (action IN ('created', 'verify', 'payment', 'collect')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS package_events_package_idx ON package_events (package_id, created_at);

CREATE TABLE IF NOT EXISTS package_tracking_updates (
  id uuid PRIMARY KEY,
  package_id uuid NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (char_length(status) BETWEEN 2 AND 80),
  location text NOT NULL CHECK (char_length(location) BETWEEN 2 AND 120),
  information text NOT NULL CHECK (char_length(information) BETWEEN 2 AND 500),
  updated_by uuid NOT NULL REFERENCES staff_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS package_tracking_updates_package_idx
  ON package_tracking_updates (package_id, created_at);

CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY,
  title text NOT NULL CHECK (char_length(title) BETWEEN 4 AND 120),
  body text NOT NULL CHECK (char_length(body) BETWEEN 10 AND 2000),
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES staff_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS announcements_public_idx
  ON announcements (created_at DESC) WHERE is_published = true;

CREATE TABLE IF NOT EXISTS package_batches (
  id uuid PRIMARY KEY,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 80),
  destination text NOT NULL CHECK (destination IN ('Bajawa', 'Malanuza', 'Aimere')),
  is_featured boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES staff_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (title, destination)
);

ALTER TABLE package_batches
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS package_batches_featured_destination_idx
  ON package_batches (destination) WHERE is_featured = true;

ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES package_batches(id);

CREATE INDEX IF NOT EXISTS packages_batch_idx ON packages (batch_id, created_at DESC);

CREATE TABLE IF NOT EXISTS package_batch_items (
  id uuid PRIMARY KEY,
  batch_id uuid NOT NULL REFERENCES package_batches(id) ON DELETE CASCADE,
  package_id uuid REFERENCES packages(id) ON DELETE SET NULL,
  row_number integer NOT NULL CHECK (row_number >= 1),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  pcs integer NOT NULL DEFAULT 0 CHECK (pcs >= 0),
  weight_kg numeric(7, 2) NOT NULL DEFAULT 0 CHECK (weight_kg >= 0),
  price integer NOT NULL DEFAULT 0 CHECK (price >= 0),
  note text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'excel'))
);

ALTER TABLE package_batch_items
  ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES packages(id) ON DELETE SET NULL;
ALTER TABLE package_batch_items
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'
  CHECK (source IN ('manual', 'excel'));

CREATE UNIQUE INDEX IF NOT EXISTS package_batch_items_package_idx
  ON package_batch_items (package_id) WHERE package_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS package_batch_items_batch_idx
  ON package_batch_items (batch_id, row_number);

CREATE TABLE IF NOT EXISTS customer_reviews (
  id uuid PRIMARY KEY,
  author_name text NOT NULL CHECK (char_length(author_name) BETWEEN 2 AND 80),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL CHECK (char_length(body) BETWEEN 10 AND 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  moderated_by uuid REFERENCES staff_users(id),
  moderated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_reviews_public_idx
  ON customer_reviews (created_at DESC) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS customer_reviews_moderation_idx
  ON customer_reviews (status, created_at DESC);
