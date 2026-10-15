ALTER TABLE member_terminations
  ADD COLUMN savings_before REAL NOT NULL DEFAULT 0;

ALTER TABLE member_terminations
  ADD COLUMN charges_json TEXT NOT NULL DEFAULT '[]';

ALTER TABLE member_terminations
  ADD COLUMN settlement_key TEXT NOT NULL DEFAULT '';

UPDATE member_terminations
SET savings_before = savings_applied + payout_amount
WHERE savings_before = 0;
