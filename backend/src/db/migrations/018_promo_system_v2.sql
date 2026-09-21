-- ==============================================================================
-- MISSION FLOPSHOW — 018_promo_system_v2.sql
-- Promo & Bonus Enhancements: Editable, Visibility, Discount %, Limits, Lifetime
-- ==============================================================================

ALTER TABLE promo_codes ADD COLUMN visibility TEXT NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE promo_codes ADD COLUMN discount_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE promo_codes ADD COLUMN discount_percent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE promo_codes ADD COLUMN max_uses INTEGER DEFAULT NULL;
ALTER TABLE promo_codes ADD COLUMN is_lifetime INTEGER NOT NULL DEFAULT 0;
