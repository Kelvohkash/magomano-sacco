-- Monotonic account revisions back conditional GETs. Unlike wall-clock cursors,
-- these ids cannot miss writes that share a timestamp or come from clock skew.
CREATE TABLE IF NOT EXISTS sync_revisions (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  revision INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO sync_revisions (id, revision) VALUES (1, 0);

CREATE TABLE IF NOT EXISTS member_sync_revisions (
  member_id INTEGER PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO member_sync_revisions (member_id, revision)
SELECT id, 0 FROM members;

CREATE TRIGGER IF NOT EXISTS sync_members_insert AFTER INSERT ON members BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  INSERT OR IGNORE INTO member_sync_revisions (member_id, revision) VALUES (NEW.id, 1);
END;
CREATE TRIGGER IF NOT EXISTS sync_members_update AFTER UPDATE ON members BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  INSERT INTO member_sync_revisions (member_id, revision) VALUES (NEW.id, 1)
    ON CONFLICT(member_id) DO UPDATE SET revision = revision + 1;
END;
CREATE TRIGGER IF NOT EXISTS sync_members_delete AFTER DELETE ON members BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_savings_insert AFTER INSERT ON savings_transactions BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1 WHERE member_id = NEW.member_id;
END;
CREATE TRIGGER IF NOT EXISTS sync_savings_update AFTER UPDATE ON savings_transactions BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1 WHERE member_id IN (OLD.member_id, NEW.member_id);
END;
CREATE TRIGGER IF NOT EXISTS sync_savings_delete AFTER DELETE ON savings_transactions BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1 WHERE member_id = OLD.member_id;
END;

CREATE TRIGGER IF NOT EXISTS sync_loans_insert AFTER INSERT ON member_loans BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1 WHERE member_id = NEW.member_id;
END;
CREATE TRIGGER IF NOT EXISTS sync_loans_update AFTER UPDATE ON member_loans BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1 WHERE member_id IN (OLD.member_id, NEW.member_id);
END;
CREATE TRIGGER IF NOT EXISTS sync_loans_delete AFTER DELETE ON member_loans BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1 WHERE member_id = OLD.member_id;
END;

CREATE TRIGGER IF NOT EXISTS sync_applications_insert AFTER INSERT ON loan_applications BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1 WHERE member_id = NEW.member_id;
END;
CREATE TRIGGER IF NOT EXISTS sync_applications_update AFTER UPDATE ON loan_applications BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1 WHERE member_id IN (OLD.member_id, NEW.member_id);
END;
CREATE TRIGGER IF NOT EXISTS sync_applications_delete AFTER DELETE ON loan_applications BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1 WHERE member_id = OLD.member_id;
END;

CREATE TRIGGER IF NOT EXISTS sync_dividends_insert AFTER INSERT ON dividend_payments BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1 WHERE member_id = NEW.member_id;
END;
CREATE TRIGGER IF NOT EXISTS sync_dividends_update AFTER UPDATE ON dividend_payments BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1 WHERE member_id IN (OLD.member_id, NEW.member_id);
END;
CREATE TRIGGER IF NOT EXISTS sync_dividends_delete AFTER DELETE ON dividend_payments BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1 WHERE member_id = OLD.member_id;
END;

CREATE TRIGGER IF NOT EXISTS sync_repayments_insert AFTER INSERT ON loan_repayments BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1
    WHERE member_id = (SELECT member_id FROM member_loans WHERE id = NEW.loan_id);
END;
CREATE TRIGGER IF NOT EXISTS sync_repayments_update AFTER UPDATE ON loan_repayments BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1
    WHERE member_id IN (SELECT member_id FROM member_loans WHERE id IN (OLD.loan_id, NEW.loan_id));
END;
CREATE TRIGGER IF NOT EXISTS sync_repayments_delete AFTER DELETE ON loan_repayments BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1
    WHERE member_id = (SELECT member_id FROM member_loans WHERE id = OLD.loan_id);
END;

CREATE TRIGGER IF NOT EXISTS sync_unallocated_insert AFTER INSERT ON unallocated_loan_payments BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1 WHERE member_id = NEW.member_id;
END;
CREATE TRIGGER IF NOT EXISTS sync_unallocated_update AFTER UPDATE ON unallocated_loan_payments BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1 WHERE member_id IN (OLD.member_id, NEW.member_id);
END;
CREATE TRIGGER IF NOT EXISTS sync_unallocated_delete AFTER DELETE ON unallocated_loan_payments BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1 WHERE member_id = OLD.member_id;
END;

CREATE TRIGGER IF NOT EXISTS sync_contacts_insert AFTER INSERT ON member_contacts BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1 WHERE member_id = NEW.member_id;
END;
CREATE TRIGGER IF NOT EXISTS sync_contacts_update AFTER UPDATE ON member_contacts BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1 WHERE member_id IN (OLD.member_id, NEW.member_id);
END;
CREATE TRIGGER IF NOT EXISTS sync_contacts_delete AFTER DELETE ON member_contacts BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1 WHERE member_id = OLD.member_id;
END;

CREATE TRIGGER IF NOT EXISTS sync_popup_messages_insert AFTER INSERT ON member_popup_messages BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1
    WHERE NEW.target_type = 'all' OR member_id = NEW.target_member_id;
END;
CREATE TRIGGER IF NOT EXISTS sync_popup_messages_update AFTER UPDATE ON member_popup_messages BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1
    WHERE OLD.target_type = 'all' OR NEW.target_type = 'all'
      OR member_id IN (OLD.target_member_id, NEW.target_member_id);
END;
CREATE TRIGGER IF NOT EXISTS sync_popup_messages_delete AFTER DELETE ON member_popup_messages BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1
    WHERE OLD.target_type = 'all' OR member_id = OLD.target_member_id;
END;

CREATE TRIGGER IF NOT EXISTS sync_popup_recipients_insert AFTER INSERT ON member_popup_message_recipients BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1 WHERE member_id = NEW.member_id;
END;
CREATE TRIGGER IF NOT EXISTS sync_popup_recipients_delete AFTER DELETE ON member_popup_message_recipients BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1 WHERE member_id = OLD.member_id;
END;

CREATE TRIGGER IF NOT EXISTS sync_member_terms_insert AFTER INSERT ON member_terms_acceptances BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1 WHERE member_id = NEW.member_id;
END;
CREATE TRIGGER IF NOT EXISTS sync_member_terms_update AFTER UPDATE ON member_terms_acceptances BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1 WHERE member_id IN (OLD.member_id, NEW.member_id);
END;
CREATE TRIGGER IF NOT EXISTS sync_member_terms_delete AFTER DELETE ON member_terms_acceptances BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1 WHERE member_id = OLD.member_id;
END;

CREATE TRIGGER IF NOT EXISTS sync_interest_disbursements_insert AFTER INSERT ON interest_disbursements BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER IF NOT EXISTS sync_interest_disbursements_update AFTER UPDATE ON interest_disbursements BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER IF NOT EXISTS sync_interest_disbursements_delete AFTER DELETE ON interest_disbursements BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER IF NOT EXISTS sync_member_terminations_insert AFTER INSERT ON member_terminations BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1 WHERE member_id = NEW.member_id;
END;
CREATE TRIGGER IF NOT EXISTS sync_member_terminations_update AFTER UPDATE ON member_terminations BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1 WHERE member_id IN (OLD.member_id, NEW.member_id);
END;
CREATE TRIGGER IF NOT EXISTS sync_member_terminations_delete AFTER DELETE ON member_terminations BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1 WHERE member_id = OLD.member_id;
END;

CREATE TRIGGER IF NOT EXISTS sync_maintenance_update AFTER UPDATE ON maintenance_mode BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1;
END;
CREATE TRIGGER IF NOT EXISTS sync_terms_insert AFTER INSERT ON sacco_terms BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1;
END;
CREATE TRIGGER IF NOT EXISTS sync_terms_update AFTER UPDATE ON sacco_terms BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1;
END;
CREATE TRIGGER IF NOT EXISTS sync_terms_delete AFTER DELETE ON sacco_terms BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
  UPDATE member_sync_revisions SET revision = revision + 1;
END;

-- The administrator workspace aggregates every account, so any database change
-- that affects a dashboard or list advances the administrator revision.
CREATE TRIGGER IF NOT EXISTS sync_admins_insert AFTER INSERT ON admins BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER IF NOT EXISTS sync_admins_update AFTER UPDATE ON admins BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
END;
CREATE TRIGGER IF NOT EXISTS sync_admins_delete AFTER DELETE ON admins BEGIN
  UPDATE sync_revisions SET revision = revision + 1 WHERE id = 1;
END;
