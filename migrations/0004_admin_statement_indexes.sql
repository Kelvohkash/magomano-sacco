CREATE INDEX IF NOT EXISTS savings_transactions_deposit_statement
  ON savings_transactions(occurred_at DESC, id DESC)
  WHERE entry_type = 'deposit';

CREATE INDEX IF NOT EXISTS member_loans_admin_statement
  ON member_loans(issued_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS loan_repayments_admin_statement
  ON loan_repayments(paid_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS dividend_payments_admin_statement
  ON dividend_payments(paid_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS loan_applications_admin_statement
  ON loan_applications(applied_at DESC, id DESC);
