-- P101 S10.T01 — Bus-factor backup admin nominations
-- Tracks one backup admin nomination per critical account category.
-- 13 critical accounts per PPI bus-factor doctrine.
--
-- See: .claude/docs/operations/bus-factor.md
-- See: .claude/docs/architecture/multi-tenant-conventions.md
--
-- Convention: This is a single-operator nself-admin table. It uses
-- source_account_id for multi-app isolation (NOT tenant_id — admin
-- is not multi-tenant Cloud-customer infrastructure).

BEGIN;

-- ---------------------------------------------------------------------
-- Table: np_bus_factor_nominations
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS np_bus_factor_nominations (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_account_id     TEXT NOT NULL DEFAULT 'primary',

    -- Account category identifier (one of 13 + license keypair)
    account_id            TEXT NOT NULL,
    account_category      TEXT NOT NULL,  -- 'github', 'hetzner', 'cloudflare', etc.

    -- Nominee identity (PII minimised — handle + verified email only)
    nominee_handle        TEXT NOT NULL,  -- GitHub username / Vercel handle / etc.
    nominee_email         TEXT NOT NULL,
    nominee_email_verified BOOLEAN NOT NULL DEFAULT FALSE,

    -- Role assignment
    role                  TEXT NOT NULL CHECK (role IN ('backup_admin', 'observer')),

    -- Pre-verification result snapshot
    verification_method   TEXT NOT NULL,  -- 'github-api', 'hetzner-api', 'manual-attestation', etc.
    verification_status   TEXT NOT NULL CHECK (
        verification_status IN ('pending', 'verified', 'failed', 'awaiting_attestation')
    ) DEFAULT 'pending',
    verification_response JSONB,          -- raw API response or attestation token
    verified_at           TIMESTAMPTZ,

    -- Operator confirmation (explicit "I confirm access verified" checkbox)
    operator_confirmed    BOOLEAN NOT NULL DEFAULT FALSE,
    operator_notes        TEXT,

    -- Standard audit columns
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by            TEXT,  -- operator who recorded the nomination

    -- Soft delete (revocation without losing audit trail)
    revoked_at            TIMESTAMPTZ,
    revoked_reason        TEXT,

    UNIQUE (source_account_id, account_id, nominee_handle)
);

CREATE INDEX IF NOT EXISTS idx_bus_factor_account_id
    ON np_bus_factor_nominations (source_account_id, account_id)
    WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bus_factor_verification_status
    ON np_bus_factor_nominations (verification_status);

-- ---------------------------------------------------------------------
-- Table: np_bus_factor_audit_log
-- ---------------------------------------------------------------------
-- Append-only ledger of every nomination event for compliance.
-- Survives Postgres dump/restore. Never UPDATEd, only INSERTed.
CREATE TABLE IF NOT EXISTS np_bus_factor_audit_log (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_account_id TEXT NOT NULL DEFAULT 'primary',
    nomination_id     UUID REFERENCES np_bus_factor_nominations(id),

    event_type        TEXT NOT NULL CHECK (event_type IN (
        'nomination.created',
        'nomination.updated',
        'nomination.verified',
        'nomination.verification_failed',
        'nomination.revoked',
        'nomination.attestation_sent',
        'nomination.attestation_confirmed'
    )),
    actor             TEXT NOT NULL,  -- operator email / username
    actor_ip          TEXT,
    target_account    TEXT NOT NULL,
    nominee_handle    TEXT,
    nominee_email     TEXT,
    details           JSONB,          -- event-specific payload
    success           BOOLEAN NOT NULL DEFAULT TRUE,

    occurred_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bus_factor_audit_occurred
    ON np_bus_factor_audit_log (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_bus_factor_audit_nomination
    ON np_bus_factor_audit_log (nomination_id);

-- ---------------------------------------------------------------------
-- updated_at trigger for nominations
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_bus_factor_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bus_factor_updated_at ON np_bus_factor_nominations;
CREATE TRIGGER bus_factor_updated_at
    BEFORE UPDATE ON np_bus_factor_nominations
    FOR EACH ROW
    EXECUTE FUNCTION trg_bus_factor_set_updated_at();

COMMIT;
