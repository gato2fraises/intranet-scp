import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { initializeDatabase } from './database'
import { runAsync, getAsync } from './utils'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import authRoutes from './routes/auth'
import documentRoutes from './routes/documents'
import messageRoutes from './routes/messages'
import rhRoutes from './routes/rh'
import logRoutes from './routes/logs'
import annuaireRoutes from './routes/annuaire'
import moduleRoutes from './routes/modules'
import permissionRoutes from './routes/permissions'
import aliasesRoutes from './routes/aliases'
import restrictionsRoutes from './routes/restrictions'
import dashboardRoutes from './routes/dashboard'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const initMarkerFile = path.join(__dirname, '../data/.initialized')

const app = express()
const PORT = process.env.PORT || 3001
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

// Debug: Check all messages
app.get('/api/debug/messages-all', async (req, res) => {
  try {
    const messages = await getAsync<any>(
      `SELECT m.id, m.sender_id, m.subject, u.username as sender
       FROM messages m
       JOIN users u ON m.sender_id = u.id`
    )
    res.json(messages)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// Debug: Check users
app.get('/api/debug/users-all', async (req, res) => {
  try {
    const users = await getAsync<any>(`SELECT id, username FROM users`)
    res.json(users)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/message-aliases', aliasesRoutes)
app.use('/api/message-restrictions', restrictionsRoutes)
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

    // Check if this is the first initialization
    const isFirstInit = !fs.existsSync(initMarkerFile)

    if (isFirstInit) {
      // Create test user only on first init
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

      // Create admin user only on first init
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
      } catch (err: any) {
        if (err.code !== 'SQLITE_CONSTRAINT') {
          throw err
        }
      }

      // Create marker file to indicate initialization is complete
      fs.mkdirSync(path.dirname(initMarkerFile), { recursive: true })
      fs.writeFileSync(initMarkerFile, new Date().toISOString())
      console.log('✓ Database initialized (users will not be recreated on restart)')
    } else {
      console.log('✓ Database already initialized (skipping seed)')
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
