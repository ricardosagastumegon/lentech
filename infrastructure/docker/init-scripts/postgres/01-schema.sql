-- ============================================================
-- MONDEGA DIGITAL — PostgreSQL Schema
-- Primary database: accounts, wallets, transactions, KYC
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---- ENUM TYPES ----

CREATE TYPE kyc_level AS ENUM ('0','1','2','3');
CREATE TYPE kyc_status AS ENUM ('pending','in_review','approved','rejected','expired');
CREATE TYPE user_status AS ENUM ('active','suspended','blocked','pending_kyc');
CREATE TYPE aml_risk AS ENUM ('low','medium','high','critical');
CREATE TYPE country_code AS ENUM ('GT','MX','HN','SV','NI','BZ','CR','US');
CREATE TYPE digital_coin AS ENUM ('QUETZA','MEXCOIN','LEMPI','COLON','NICORD','TIKAL','CORI','DOLAR');
CREATE TYPE fiat_currency AS ENUM ('GTQ','MXN','HNL','SVC','NIO','BZD','CRC','USD');
CREATE TYPE tx_type AS ENUM ('purchase','sale','transfer','fiat_load','fiat_withdraw','fx_swap','fee','refund');
CREATE TYPE tx_status AS ENUM ('pending','processing','confirming','completed','failed','reversed');
CREATE TYPE doc_type AS ENUM ('national_id','passport','drivers_license','utility_bill','selfie','business_reg');

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id         VARCHAR(50)  UNIQUE NOT NULL,        -- e.g. "usr_a1b2c3..."
    phone_number        VARCHAR(20)  UNIQUE NOT NULL,        -- E.164 format
    phone_verified      BOOLEAN      NOT NULL DEFAULT FALSE,
    phone_verified_at   TIMESTAMPTZ,
    email               VARCHAR(255) UNIQUE,
    email_verified      BOOLEAN      NOT NULL DEFAULT FALSE,
    first_name          VARCHAR(100),
    last_name           VARCHAR(100),
    country             country_code NOT NULL,
    pin_hash            VARCHAR(255) NOT NULL,               -- argon2id hash
    pin_failed_attempts SMALLINT     NOT NULL DEFAULT 0,
    pin_locked_until    TIMESTAMPTZ,
    kyc_level           kyc_level    NOT NULL DEFAULT '0',
    kyc_status          kyc_status   NOT NULL DEFAULT 'pending',
    status              user_status  NOT NULL DEFAULT 'pending_kyc',
    aml_risk            aml_risk     NOT NULL DEFAULT 'low',
    referral_code       VARCHAR(20)  UNIQUE NOT NULL,
    referred_by         VARCHAR(20),
    known_devices       JSONB        NOT NULL DEFAULT '[]',
    totp_secret         TEXT,                                -- Encrypted TOTP secret
    totp_enabled        BOOLEAN      NOT NULL DEFAULT FALSE,
    last_login_at       TIMESTAMPTZ,
    last_login_ip       INET,
    deleted_at          TIMESTAMPTZ,                         -- Soft delete
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone      ON users(phone_number);
CREATE INDEX idx_users_status     ON users(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_kyc_level  ON users(kyc_level);
CREATE INDEX idx_users_country    ON users(country);
CREATE INDEX idx_users_aml_risk   ON users(aml_risk) WHERE aml_risk != 'low';

-- ============================================================
-- TABLE: wallets
-- One wallet per user per coin type
-- ============================================================
CREATE TABLE IF NOT EXISTS wallets (
    id                       UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id              VARCHAR(50)  UNIQUE NOT NULL,
    user_id                  UUID         NOT NULL REFERENCES users(id),
    coin                     digital_coin NOT NULL,
    blockchain_address       VARCHAR(42)  UNIQUE NOT NULL, -- Polygon/EVM address
    balance                  NUMERIC(30,8) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    balance_reserved         NUMERIC(30,8) NOT NULL DEFAULT 0 CHECK (balance_reserved >= 0),
    total_received           NUMERIC(30,8) NOT NULL DEFAULT 0,
    total_sent               NUMERIC(30,8) NOT NULL DEFAULT 0,
    transaction_count        INTEGER      NOT NULL DEFAULT 0,
    is_active                BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, coin)    -- One wallet per coin per user
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_coin    ON wallets(coin);
CREATE INDEX idx_wallets_address ON wallets(blockchain_address);

-- ============================================================
-- TABLE: transactions
-- Immutable ledger — records are NEVER updated, only inserted
-- Status changes create new records (event sourcing pattern)
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
    id                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id         VARCHAR(50)  UNIQUE NOT NULL,        -- e.g. "tx_a1b2c3..."
    blockchain_tx_hash  VARCHAR(66)  UNIQUE,                 -- Polygon tx hash
    type                tx_type      NOT NULL,
    status              tx_status    NOT NULL DEFAULT 'pending',

    -- Parties
    from_user_id        UUID         REFERENCES users(id),
    to_user_id          UUID         REFERENCES users(id),
    from_wallet_id      UUID         REFERENCES wallets(id),
    to_wallet_id        UUID         REFERENCES wallets(id),
    from_address        VARCHAR(42),
    to_address          VARCHAR(42),

    -- Amounts (each side can be different coin in FX swap)
    from_coin           digital_coin NOT NULL,
    to_coin             digital_coin NOT NULL,
    from_amount         NUMERIC(30,8) NOT NULL CHECK (from_amount > 0),
    to_amount           NUMERIC(30,8) NOT NULL CHECK (to_amount > 0),
    fee_amount          NUMERIC(30,8) NOT NULL DEFAULT 0,
    fee_coin            digital_coin,

    -- FX data (if cross-coin)
    fx_rate             NUMERIC(20,8),                       -- fromCoin per toCoin
    fx_usd_equivalent   NUMERIC(20,2),

    -- Metadata
    description         TEXT,
    reference_id        VARCHAR(100),                        -- External reference (bank, OXXO, etc.)
    metadata            JSONB,

    -- Blockchain confirmation
    block_number        BIGINT,
    confirmations       SMALLINT     NOT NULL DEFAULT 0,

    -- Timestamps
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ,
    failed_at           TIMESTAMPTZ,
    failure_reason      TEXT
);

-- Partitioned by month for performance at scale
-- CREATE TABLE transactions_2025_01 PARTITION OF transactions FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE INDEX idx_tx_from_user   ON transactions(from_user_id, created_at DESC);
CREATE INDEX idx_tx_to_user     ON transactions(to_user_id, created_at DESC);
CREATE INDEX idx_tx_status      ON transactions(status) WHERE status IN ('pending','processing','confirming');
CREATE INDEX idx_tx_hash        ON transactions(blockchain_tx_hash) WHERE blockchain_tx_hash IS NOT NULL;
CREATE INDEX idx_tx_created_at  ON transactions(created_at DESC);
CREATE INDEX idx_tx_type        ON transactions(type);

-- ============================================================
-- TABLE: fx_rates
-- Historical exchange rate log (used for audits and analytics)
-- ============================================================
CREATE TABLE IF NOT EXISTS fx_rates (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_coin   digital_coin NOT NULL,
    to_coin     digital_coin NOT NULL,
    rate        NUMERIC(20,8) NOT NULL,
    source      VARCHAR(50)  NOT NULL,     -- 'chainlink', 'openexchangerates', 'fallback'
    fetched_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fx_rates_pair ON fx_rates(from_coin, to_coin, fetched_at DESC);

-- ============================================================
-- TABLE: kyc_documents
-- ============================================================
CREATE TABLE IF NOT EXISTS kyc_documents (
    id                   UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id              UUID         NOT NULL REFERENCES users(id),
    document_type        doc_type     NOT NULL,
    country              country_code NOT NULL,
    s3_key               VARCHAR(500) NOT NULL,              -- Encrypted S3 path
    status               kyc_status   NOT NULL DEFAULT 'pending',
    verification_provider VARCHAR(50),
    external_id          VARCHAR(200),                       -- Provider's doc ID
    rejection_reason     TEXT,
    expires_at           TIMESTAMPTZ,
    reviewed_at          TIMESTAMPTZ,
    reviewed_by          UUID         REFERENCES users(id),
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kyc_docs_user   ON kyc_documents(user_id);
CREATE INDEX idx_kyc_docs_status ON kyc_documents(status) WHERE status = 'pending';

-- ============================================================
-- TABLE: sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
    id                  VARCHAR(50)  PRIMARY KEY,
    user_id             UUID         NOT NULL REFERENCES users(id),
    refresh_token_hash  VARCHAR(255) NOT NULL,
    token_index         VARCHAR(64)  UNIQUE NOT NULL,            -- SHA-256 of raw token — O(1) lookup
    user_agent          TEXT,
    ip_address          INET,
    is_revoked          BOOLEAN      NOT NULL DEFAULT FALSE,
    revoked_at          TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ  NOT NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user       ON sessions(user_id);
CREATE INDEX idx_sessions_active     ON sessions(user_id) WHERE is_revoked = FALSE;
CREATE UNIQUE INDEX idx_sessions_token_index ON sessions(token_index);

-- ============================================================
-- TABLE: otp_codes
-- ============================================================
CREATE TABLE IF NOT EXISTS otp_codes (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number     VARCHAR(20) NOT NULL,
    code_hash        VARCHAR(255) NOT NULL,
    type             VARCHAR(30) NOT NULL,    -- 'verification', 'pin_reset', 'high_value_tx'
    used             BOOLEAN     NOT NULL DEFAULT FALSE,
    failed_attempts  SMALLINT    NOT NULL DEFAULT 0,
    expires_at       TIMESTAMPTZ NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_phone ON otp_codes(phone_number, type) WHERE used = FALSE;

-- ============================================================
-- TABLE: fiat_transactions
-- Tracks loads/withdrawals through bank/payment integrations
-- ============================================================
CREATE TABLE IF NOT EXISTS fiat_transactions (
    id                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID         NOT NULL REFERENCES users(id),
    mondega_tx_id       UUID         REFERENCES transactions(id),
    provider            VARCHAR(50)  NOT NULL,    -- 'banrural','bam','codi','spei','oxxo'
    external_reference  VARCHAR(200) UNIQUE,      -- Provider's reference ID
    type                VARCHAR(10)  NOT NULL CHECK (type IN ('load','withdraw')),
    amount              NUMERIC(20,2) NOT NULL,
    currency            fiat_currency NOT NULL,
    coin                digital_coin  NOT NULL,
    coin_amount         NUMERIC(30,8),
    status              VARCHAR(20)  NOT NULL DEFAULT 'pending',
    webhook_received    BOOLEAN      NOT NULL DEFAULT FALSE,
    webhook_payload     JSONB,
    error_message       TEXT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fiat_tx_user   ON fiat_transactions(user_id);
CREATE INDEX idx_fiat_tx_status ON fiat_transactions(status) WHERE status = 'pending';
CREATE INDEX idx_fiat_tx_ref    ON fiat_transactions(external_reference);

-- ============================================================
-- TABLE: aml_alerts
-- ============================================================
CREATE TYPE aml_risk_level  AS ENUM ('low','medium','high','critical');
CREATE TYPE alert_status     AS ENUM ('open','investigating','cleared','reported');

CREATE TABLE IF NOT EXISTS aml_alerts (
    id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID          NOT NULL REFERENCES users(id),
    transaction_id   UUID          REFERENCES transactions(id),
    risk_level       aml_risk_level NOT NULL,
    rule_triggered   VARCHAR(100)  NOT NULL,
    description      TEXT          NOT NULL,
    status           alert_status  NOT NULL DEFAULT 'open',
    assigned_to      VARCHAR(100),
    resolution_notes TEXT,
    resolved_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aml_alerts_user   ON aml_alerts(user_id);
CREATE INDEX idx_aml_alerts_status ON aml_alerts(status);
CREATE INDEX idx_aml_alerts_risk   ON aml_alerts(risk_level) WHERE status = 'open';

-- ============================================================
-- TABLE: cards
-- ============================================================
CREATE TYPE card_status AS ENUM ('pending','active','frozen','terminated');
CREATE TYPE card_type   AS ENUM ('virtual','physical');

CREATE TABLE IF NOT EXISTS cards (
    id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID        NOT NULL REFERENCES users(id),
    wallet_id               UUID        NOT NULL REFERENCES wallets(id),
    issuer_card_id          VARCHAR(100) UNIQUE NOT NULL,
    card_type               card_type   NOT NULL DEFAULT 'virtual',
    status                  card_status NOT NULL DEFAULT 'pending',
    last_four               CHAR(4)     NOT NULL,
    pan_encrypted           TEXT        NOT NULL,               -- AES-256-GCM encrypted PAN
    expiry_month            SMALLINT    NOT NULL,
    expiry_year             SMALLINT    NOT NULL,
    cardholder_name         VARCHAR(200) NOT NULL,
    spending_limit_daily_usd NUMERIC(10,2) NOT NULL DEFAULT 500.00,
    mpc_key_id              VARCHAR(100),
    activated_at            TIMESTAMPTZ,
    terminated_at           TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cards_user   ON cards(user_id);
CREATE INDEX idx_cards_status ON cards(status);

-- ============================================================
-- TABLE: card_transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS card_transactions (
    id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id          UUID          NOT NULL REFERENCES cards(id),
    user_id          UUID          NOT NULL REFERENCES users(id),
    amount_usd       NUMERIC(10,2) NOT NULL,
    merchant_name    VARCHAR(200),
    merchant_category VARCHAR(50),
    status           VARCHAR(20)   NOT NULL DEFAULT 'pending',
    authorization_code VARCHAR(50),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_card_tx_card ON card_transactions(card_id, created_at DESC);
CREATE INDEX idx_card_tx_user ON card_transactions(user_id, created_at DESC);

CREATE TRIGGER update_aml_alerts_updated_at BEFORE UPDATE ON aml_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cards_updated_at      BEFORE UPDATE ON cards      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- FUNCTION: auto-update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at         BEFORE UPDATE ON users         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at       BEFORE UPDATE ON wallets       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at  BEFORE UPDATE ON transactions  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kyc_docs_updated_at      BEFORE UPDATE ON kyc_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fiat_tx_updated_at       BEFORE UPDATE ON fiat_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED: Admin user (dev only — remove in production)
-- ============================================================
-- INSERT INTO users (external_id, phone_number, country, pin_hash, kyc_level, kyc_status, status, referral_code)
-- VALUES ('usr_admin_dev', '+50200000000', 'GT', 'CHANGE_ME_hash', '3', 'approved', 'active', 'ADMIN001');
