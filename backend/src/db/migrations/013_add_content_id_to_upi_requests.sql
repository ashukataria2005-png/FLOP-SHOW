-- Migration 013: Add content_id to upi_payment_requests for per-title entitlement tracking
-- This column tracks which specific movie/series a UTR payment was submitted for.
-- Without this, manual approval of movie/series purchases could not correctly grant entitlements.

-- SQLite version (used in development)
ALTER TABLE upi_payment_requests ADD COLUMN content_id TEXT REFERENCES content(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_upi_payment_requests_content_id ON upi_payment_requests(content_id);
