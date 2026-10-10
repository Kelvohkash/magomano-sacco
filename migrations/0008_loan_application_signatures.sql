ALTER TABLE loan_applications ADD COLUMN payout_bank_name TEXT NOT NULL DEFAULT '';
ALTER TABLE loan_applications ADD COLUMN payout_bank_branch TEXT NOT NULL DEFAULT '';
ALTER TABLE loan_applications ADD COLUMN payout_account_name TEXT NOT NULL DEFAULT '';
ALTER TABLE loan_applications ADD COLUMN payout_account_number TEXT NOT NULL DEFAULT '';
ALTER TABLE loan_applications ADD COLUMN electronic_signature_name TEXT NOT NULL DEFAULT '';
ALTER TABLE loan_applications ADD COLUMN electronically_signed_at TEXT;
