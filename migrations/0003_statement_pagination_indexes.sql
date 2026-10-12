CREATE INDEX IF NOT EXISTS savings_transactions_member_statement
  ON savings_transactions(member_id, occurred_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS member_loans_member_statement
  ON member_loans(member_id, issued_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS loan_repayments_loan_statement
  ON loan_repayments(loan_id, paid_at DESC, id DESC);
