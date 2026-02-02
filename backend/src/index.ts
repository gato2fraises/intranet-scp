import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { initializeDatabase } from './database'
import { runAsync, getAsync } from './utils'
import bcrypt from 'bcryptjs'

import authRoutes from './routes/auth'
import documentRoutes from './routes/documents'
import messageRoutes from './routes/messages'
import rhRoutes from './routes/rh'
import logRoutes from './routes/logs'
import annuaireRoutes from './routes/annuaire'
import moduleRoutes from './routes/modules'
import permissionRoutes from './routes/permissions'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

// CORS Configuration
const corsOptions = {
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

// Middleware
app.use(cors(corsOptions))
app.use(express.json())

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/rh', rhRoutes)
app.use('/api/logs', logRoutes)
app.use('/api/annuaire', annuaireRoutes)
app.use('/api/modules', moduleRoutes)
app.use('/api/permissions', permissionRoutes)

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// Initialize database and start server
async function start() {
  try {
    console.log('📦 Initializing database...')
    await initializeDatabase()

    // Create test user if not exists
    const testUser = await getAsync<any>(
      'SELECT id FROM users WHERE username = ?',
      ['test']
    ).catch(() => null)

    if (!testUser) {
      try {
        const hashedPassword = await bcrypt.hash('password', 10)
        await runAsync(
          `INSERT INTO users (username, password, role, clearance, department, suspended)
           VALUES (?, ?, ?, ?, ?, ?)`,
          ['test', hashedPassword, 'scientifique', 2, 'Recherche', 0]
        )
        console.log('✓ Test user created (username: test, password: password)')
      } catch (err: any) {
        if (err.code !== 'SQLITE_CONSTRAINT') {
          throw err
        }
      }
    }

    // Create admin user if not exists
    const adminUser = await getAsync<any>(
      'SELECT id FROM users WHERE username = ?',
      ['administrateur@site.obsidian.fr']
    ).catch(() => null)

    if (!adminUser) {
      try {
        const adminPassword = 'Obsidian#SecureAdmin2024@Fr'
        const hashedAdminPassword = await bcrypt.hash(adminPassword, 10)
        await runAsync(
          `INSERT INTO users (username, password, role, clearance, department, suspended)
           VALUES (?, ?, ?, ?, ?, ?)`,
          ['administrateur@site.obsidian.fr', hashedAdminPassword, 'admin', 6, 'Direction', 0]
        )
        console.log('✓ Admin user created')
        console.log('  Email: administrateur@site.obsidian.fr')
        console.log('  Password: Obsidian#SecureAdmin2024@Fr')
        console.log('  Role: Admin (Clearance 6)')
      } catch (err: any) {
        if (err.code !== 'SQLITE_CONSTRAINT') {
          throw err
        }
      }
    }

    app.listen(PORT, () => {
      console.log(`\n✓ Server running on http://localhost:${PORT}`)
      console.log(`✓ API available at http://localhost:${PORT}/api`)
      console.log('\nEndpoints:')
      console.log('  POST   /api/auth/login')
      console.log('  GET    /api/documents')
      console.log('  GET    /api/messages/inbox')
      console.log('  GET    /api/rh/users')
      console.log('  GET    /api/logs')
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

start()
