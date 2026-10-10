import { Hono } from 'hono'
import { DbEnv, initDb } from '../database'
import { authRoutes } from './auth'
import { memberRoutes } from './member'
import { adminRoutes } from './admin'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Initialization middleware to ensure DB tables exist
app.use('*', async (c, next) => {
  try {
    await initDb(c.env.DB)
  } catch (e) {
    console.error('DB Init Error:', e)
  }
  await next()
})

app.route('/api', authRoutes)
app.route('/api', memberRoutes)
app.route('/api', adminRoutes)

export default app
