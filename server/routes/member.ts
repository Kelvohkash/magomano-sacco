import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
}

const member = new Hono<{ Bindings: Bindings }>()

member.get('/member/dashboard', async (c) => {
  const sessionId = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1]
  if (!sessionId) return c.json({ error: 'Unauthorized' }, 401)

  const member = await c.env.DB.prepare('SELECT * FROM members WHERE id = ?').bind(sessionId).first()
  if (!member) return c.json({ error: 'Member not found' }, 404)

  const savings = await c.env.DB.prepare('SELECT SUM(amount) as total FROM savings_transactions WHERE member_id = ?').bind(member.id).first()
  
  return c.json({
    member,
    savings: savings.total || 0
  })
})

export { member as memberRoutes }
