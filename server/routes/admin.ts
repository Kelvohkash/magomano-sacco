import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
}

const admin = new Hono<{ Bindings: Bindings }>()

admin.get('/admin/stats', async (c) => {
  const stats = await c.env.DB.prepare('SELECT COUNT(*) as count FROM members').first()
  return c.json({ totalMembers: stats.count })
})

export { admin as adminRoutes }
