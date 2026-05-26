-- ================================================================
-- OPTFLOW — CockroachDB Schema
-- Run against: optflow database
-- psql "<CONNECTION_STRING_with_/optflow>" -f cockroach-schema.sql
-- ================================================================

-- 1. USERS (auth + profile combined — no Supabase dependency)
CREATE TABLE IF NOT EXISTS users (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email                TEXT UNIQUE NOT NULL,
  password_hash        TEXT NOT NULL,
  full_name            TEXT,
  plan                 TEXT DEFAULT 'free' CHECK (plan IN ('free','pro','admin')),
  whatsapp             TEXT,
  phone                TEXT,
  alert_min_confidence INT DEFAULT 75,
  alerts_enabled       BOOLEAN DEFAULT false,
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- 2. SIGNALS
CREATE TABLE IF NOT EXISTS signals (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  symbol        TEXT NOT NULL,
  expiry        TEXT,
  direction     TEXT CHECK (direction IN ('CALL','PUT','WAIT')),
  confidence    INT,
  strategy_type TEXT,
  signal_json   JSONB,
  strategy_json JSONB,
  pcr           NUMERIC,
  spot          NUMERIC,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS signals_user_created ON signals(user_id, created_at DESC);

-- 3. TRADES / P&L JOURNAL
CREATE TABLE IF NOT EXISTS trades (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  signal_id        UUID REFERENCES signals(id) ON DELETE SET NULL,
  symbol           TEXT NOT NULL,
  strategy_type    TEXT,
  direction        TEXT,
  entry_price      NUMERIC,
  exit_price       NUMERIC,
  quantity         INT DEFAULT 1,
  premium_paid     NUMERIC,
  premium_received NUMERIC,
  pnl              NUMERIC AS (
                     CASE WHEN exit_price IS NOT NULL AND entry_price IS NOT NULL
                     THEN (exit_price - entry_price) * quantity
                     ELSE NULL END
                   ) STORED,
  result           TEXT CHECK (result IN ('WIN','LOSS','SCRATCH','OPEN')),
  notes            TEXT,
  entry_at         TIMESTAMPTZ DEFAULT now(),
  exit_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trades_user_created ON trades(user_id, created_at DESC);

-- 4. BACKTEST RESULTS
CREATE TABLE IF NOT EXISTS backtests (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  symbol         TEXT,
  strategy_type  TEXT,
  date_from      DATE,
  date_to        DATE,
  total_signals  INT,
  wins           INT,
  losses         INT,
  win_rate       NUMERIC,
  total_pnl      NUMERIC,
  avg_confidence NUMERIC,
  results_json   JSONB,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- 5. ALERT LOG
CREATE TABLE IF NOT EXISTS alert_log (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  signal_id  UUID REFERENCES signals(id) ON DELETE CASCADE,
  channel    TEXT CHECK (channel IN ('whatsapp','sms','email')),
  message    TEXT,
  sent_at    TIMESTAMPTZ DEFAULT now(),
  status     TEXT DEFAULT 'sent'
);

-- 6. ADMIN VIEW
CREATE VIEW IF NOT EXISTS admin_overview AS
  SELECT
    u.id, u.email, u.full_name, u.plan, u.created_at,
    COUNT(DISTINCT s.id) AS signal_count,
    COUNT(DISTINCT t.id) AS trade_count
  FROM users u
  LEFT JOIN signals s ON s.user_id = u.id
  LEFT JOIN trades  t ON t.user_id = u.id
  GROUP BY u.id, u.email, u.full_name, u.plan, u.created_at;
