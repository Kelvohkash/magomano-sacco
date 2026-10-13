ALTER TABLE loan_applications ADD COLUMN disbursed_at TEXT;
ALTER TABLE loan_applications ADD COLUMN disbursed_loan_reference TEXT;
ALTER TABLE loan_applications ADD COLUMN disbursement_message TEXT NOT NULL DEFAULT '';

UPDATE loan_applications
SET status = 'disbursed',
    disbursed_at = COALESCE((
      SELECT issued_at FROM member_loans
      WHERE member_id = loan_applications.member_id
        AND principal_amount = loan_applications.requested_amount
        AND issued_at >= loan_applications.applied_at
      ORDER BY issued_at ASC, id ASC LIMIT 1
    ), applied_at),
    disbursed_loan_reference = (
      SELECT loan_reference FROM member_loans
      WHERE member_id = loan_applications.member_id
        AND principal_amount = loan_applications.requested_amount
        AND issued_at >= loan_applications.applied_at
      ORDER BY issued_at ASC, id ASC LIMIT 1
    )
WHERE status = 'approved'
  AND EXISTS (
    SELECT 1 FROM member_loans
    WHERE member_id = loan_applications.member_id
      AND principal_amount = loan_applications.requested_amount
      AND issued_at >= loan_applications.applied_at
  );
