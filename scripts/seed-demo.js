import { randomBytes, scryptSync } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const remote = process.argv.includes('--remote')
if (process.argv.slice(2).some((argument) => argument !== '--remote')) {
  console.error('Usage: node scripts/seed-demo.js [--remote]')
  process.exit(1)
}
if (remote && process.env.ALLOW_REMOTE_DEMO_DATA !== '1') {
  console.error('Refusing to seed remote D1 without ALLOW_REMOTE_DEMO_DATA=1.')
  process.exit(1)
}

const demoAdmin = {
  username: 'demo-admin',
  displayName: 'DEMO - SACCO Administrator',
  password: remote ? randomBytes(24).toString('base64url') : 'DemoAdmin-2026!',
}
const demoMemberPassword = remote ? randomBytes(24).toString('base64url') : 'DemoMember-2026!'
const demoMembers = [
  {
    nationalId: '99000101',
    fullName: 'DEMO - Amina Wanjiku',
    phoneNumber: '+254 700 000 101',
    accountStatus: 'approved',
    password: demoMemberPassword,
  },
  {
    nationalId: '99000102',
    fullName: 'DEMO - Peter Mwangi',
    phoneNumber: '+254 700 000 102',
    accountStatus: 'approved',
    password: demoMemberPassword,
  },
  {
    nationalId: '99000103',
    fullName: 'DEMO - Grace Njeri',
    phoneNumber: '+254 700 000 103',
    accountStatus: 'pending',
    password: demoMemberPassword,
  },
]

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`
const passwordFields = (password) => {
  const salt = randomBytes(16).toString('hex')
  const passwordHash = scryptSync(password, Buffer.from(salt, 'hex'), 64).toString('hex')
  return { salt, passwordHash }
}
const memberRef = (member) => `(SELECT id FROM members WHERE national_id = ${quote(member.nationalId)} AND full_name = ${quote(member.fullName)})`
const adminRef = `(SELECT id FROM admins WHERE username = ${quote(demoAdmin.username)} AND display_name = ${quote(demoAdmin.displayName)})`

const adminRole = remote ? 'admin' : 'superadmin'
const adminCredentials = passwordFields(demoAdmin.password)
const statements = [`
  INSERT OR IGNORE INTO admins (username, display_name, password_salt, password_hash, role)
  VALUES (${quote(demoAdmin.username)}, ${quote(demoAdmin.displayName)}, '${adminCredentials.salt}', '${adminCredentials.passwordHash}', ${quote(adminRole)})
;
  UPDATE admins SET
    password_salt = '${adminCredentials.salt}',
    password_hash = '${adminCredentials.passwordHash}',
    role = ${quote(adminRole)}
  WHERE username = ${quote(demoAdmin.username)} AND display_name = ${quote(demoAdmin.displayName)};
`]

for (const member of demoMembers) {
  const credentials = passwordFields(member.password)
  statements.push(`
    INSERT OR IGNORE INTO members (national_id, full_name, phone_number, account_status, password_salt, password_hash)
    VALUES (${quote(member.nationalId)}, ${quote(member.fullName)}, ${quote(member.phoneNumber)}, ${quote(member.accountStatus)}, '${credentials.salt}', '${credentials.passwordHash}')
;
    UPDATE members SET
      phone_number = ${quote(member.phoneNumber)},
      account_status = ${quote(member.accountStatus)},
      password_salt = '${credentials.salt}',
      password_hash = '${credentials.passwordHash}'
    WHERE national_id = ${quote(member.nationalId)} COLLATE NOCASE AND full_name = ${quote(member.fullName)};
  `)
}

const savings = []
for (let index = 0; index < 24; index += 1) {
  const month = new Date(Date.UTC(2024, 9 + index, 5, 10))
  const occurredAt = month.toISOString().slice(0, 19).replace('T', ' ')
  savings.push({
    member: demoMembers[0],
    type: 'deposit',
    amount: 1400 + (index % 4) * 250,
    description: `DEMO monthly contribution ${String(index + 1).padStart(2, '0')}`,
    occurredAt,
  })
}
for (let index = 0; index < 5; index += 1) {
  savings.push({
    member: demoMembers[1],
    type: 'deposit',
    amount: 2200 + index * 150,
    description: `DEMO member contribution ${String(index + 1).padStart(2, '0')}`,
    occurredAt: `2026-0${index + 1}-12 09:30:00`,
  })
}
for (const entry of savings) {
  statements.push(`
    INSERT INTO savings_transactions (member_id, entry_type, amount, description, occurred_at)
    SELECT ${memberRef(entry.member)}, ${quote(entry.type)}, ${entry.amount}, ${quote(entry.description)}, ${quote(entry.occurredAt)}
    WHERE ${memberRef(entry.member)} IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM savings_transactions
        WHERE member_id = ${memberRef(entry.member)} AND description = ${quote(entry.description)} AND occurred_at = ${quote(entry.occurredAt)}
      );
  `)
}

const loans = [
  { member: demoMembers[0], reference: 'DEMO-LN-001', principal: 30000, total: 33000, balance: 19000, months: 12, status: 'active', issuedAt: '2026-01-10 09:00:00' },
  { member: demoMembers[0], reference: 'DEMO-LN-002', principal: 12000, total: 13200, balance: 13200, months: 8, status: 'active', issuedAt: '2026-06-14 11:00:00' },
  { member: demoMembers[1], reference: 'DEMO-LN-003', principal: 15000, total: 16500, balance: 0, months: 10, status: 'paid', issuedAt: '2025-07-19 10:00:00' },
]
for (const loan of loans) {
  statements.push(`
    INSERT INTO member_loans (member_id, loan_reference, principal_amount, interest_rate, repayment_months, total_repayable, outstanding_balance, status, issued_at)
    SELECT ${memberRef(loan.member)}, ${quote(loan.reference)}, ${loan.principal}, 10, ${loan.months}, ${loan.total}, ${loan.balance}, ${quote(loan.status)}, ${quote(loan.issuedAt)}
    WHERE ${memberRef(loan.member)} IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM member_loans WHERE loan_reference = ${quote(loan.reference)});
  `)
  statements.push(`
    UPDATE member_loans SET
      principal_amount = ${loan.principal},
      repayment_months = ${loan.months},
      total_repayable = ${loan.total},
      outstanding_balance = ${loan.balance},
      status = ${quote(loan.status)}
    WHERE loan_reference = ${quote(loan.reference)}
      AND member_id = ${memberRef(loan.member)};
  `)
}

const repayments = [
  ...Array.from({ length: 7 }, (_, index) => ({
    loan: loans[0],
    amount: 2000,
    paidAt: `2026-${String(index + 2).padStart(2, '0')}-15 10:00:00`,
    description: `DEMO monthly installment ${String(index + 1).padStart(2, '0')}`,
  })),
  ...Array.from({ length: 6 }, (_, index) => ({
    loan: loans[2],
    amount: 2750,
    paidAt: `2025-${String(index + 2).padStart(2, '0')}-18 10:00:00`,
    description: `DEMO settled-loan installment ${String(index + 1).padStart(2, '0')}`,
  })),
]
for (const repayment of repayments) {
  statements.push(`
    INSERT INTO loan_repayments (loan_id, admin_id, amount, description, paid_at)
    SELECT (SELECT id FROM member_loans WHERE loan_reference = ${quote(repayment.loan.reference)}), ${adminRef}, ${repayment.amount}, ${quote(repayment.description)}, ${quote(repayment.paidAt)}
    WHERE ${adminRef} IS NOT NULL
      AND EXISTS (SELECT 1 FROM member_loans WHERE loan_reference = ${quote(repayment.loan.reference)})
      AND NOT EXISTS (
        SELECT 1 FROM loan_repayments
        WHERE loan_id = (SELECT id FROM member_loans WHERE loan_reference = ${quote(repayment.loan.reference)})
          AND description = ${quote(repayment.description)} AND paid_at = ${quote(repayment.paidAt)}
      );
  `)
}

const applications = [
  { member: demoMembers[0], amount: 8000, months: 6, purpose: 'DEMO - school fees application awaiting review', status: 'pending', date: '2026-09-18 12:00:00' },
  { member: demoMembers[1], amount: 5000, months: 5, purpose: 'DEMO - small business stock application awaiting review', status: 'pending', date: '2026-09-21 12:00:00' },
  { member: demoMembers[1], amount: 3000, months: 3, purpose: 'DEMO - previous reviewed application', status: 'rejected', date: '2026-05-04 12:00:00' },
]
for (const application of applications) {
  statements.push(`
    INSERT INTO loan_applications (member_id, requested_amount, repayment_months, purpose, status, applied_at)
    SELECT ${memberRef(application.member)}, ${application.amount}, ${application.months}, ${quote(application.purpose)}, ${quote(application.status)}, ${quote(application.date)}
    WHERE ${memberRef(application.member)} IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM loan_applications WHERE member_id = ${memberRef(application.member)} AND purpose = ${quote(application.purpose)});
  `)
}

for (const dividend of [
  { member: demoMembers[0], amount: 3400, period: '2025/2026', description: 'DEMO annual member dividend', paidAt: '2026-08-10 12:00:00' },
  { member: demoMembers[1], amount: 2150, period: '2025/2026', description: 'DEMO annual member dividend', paidAt: '2026-08-11 12:00:00' },
]) {
  statements.push(`
    INSERT INTO dividend_payments (member_id, financial_period, amount, description, paid_at)
    SELECT ${memberRef(dividend.member)}, ${quote(dividend.period)}, ${dividend.amount}, ${quote(dividend.description)}, ${quote(dividend.paidAt)}
    WHERE ${memberRef(dividend.member)} IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM dividend_payments WHERE member_id = ${memberRef(dividend.member)} AND financial_period = ${quote(dividend.period)} AND description = ${quote(dividend.description)});
  `)
}

const wrangler = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url))
const result = spawnSync(process.execPath, [
  wrangler,
  'd1',
  'execute',
  'magomano-db',
  remote ? '--remote' : '--local',
  '--command',
  statements.join('\n'),
], { stdio: 'inherit' })

if (result.error) {
  console.error('Could not seed the local demo database:', result.error.message)
  process.exit(1)
}
if (result.status !== 0) process.exit(result.status ?? 1)

console.log(`
Demo accounts are ready:
  Admin (${remote ? 'admin' : 'super-admin'}): ${demoAdmin.username} / ${demoAdmin.password}
  Approved member:     ${demoMembers[0].nationalId} / ${demoMembers[0].password}
  Pending member:      ${demoMembers[2].nationalId} / ${demoMembers[2].password}
All seeded records are marked DEMO and were written to ${remote ? 'remote' : 'local'} D1.
`)
