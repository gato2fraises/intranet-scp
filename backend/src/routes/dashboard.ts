import express, { Request, Response } from 'express'
import { authMiddleware } from '../auth'
import { getAsync } from '../utils'

const router = express.Router()

// Use middleware alias 'auth'
const auth = authMiddleware

router.get('/', auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId

    // Get user info
    const user: any = await getAsync(
      'SELECT id, username, role, clearance, department, suspended, created_at FROM users WHERE id = ?',
      [userId]
    )

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Get module statuses
    const modulesStatus = {
      messagerie: 'actif',
      documents: 'actif',
      rh: 'actif',
      supervision: user.role === 'staff' || user.role === 'direction' ? 'actif' : 'desactive',
      annuaire: 'actif'
    }

    // Get messaging indicators
    let messagingIndicators = { unread: 0, receivedPeriod: 0, sentPeriod: 0 }
    try {
      const unread: any = await getAsync(
        `SELECT COUNT(*) as count FROM mailboxes 
         WHERE user_id = ? AND folder = 'inbox' AND is_read = 0`,
        [userId]
      )
      messagingIndicators.unread = unread?.count || 0

      // Messages received in last 7 days
      const received: any = await getAsync(
        `SELECT COUNT(*) as count FROM mailboxes m
         INNER JOIN messages msg ON m.message_id = msg.id
         WHERE m.user_id = ? AND m.folder = 'inbox' 
         AND datetime(msg.created_at) > datetime('now', '-7 days')`,
        [userId]
      )
      messagingIndicators.receivedPeriod = received?.count || 0

      // Messages sent in last 7 days
      const sent: any = await getAsync(
        `SELECT COUNT(*) as count FROM messages
         WHERE sender_id = ? AND datetime(created_at) > datetime('now', '-7 days')`,
        [userId]
      )
      messagingIndicators.sentPeriod = sent?.count || 0
    } catch (e) {
      console.log('Messaging indicators error:', e)
    }

    // Get document indicators
    let documentIndicators = { created: 0, recentlyViewed: 0, pendingValidation: 0 }
    try {
      const created: any = await getAsync(
        `SELECT COUNT(*) as count FROM documents WHERE author_id = ? AND is_deleted = 0`,
        [userId]
      )
      documentIndicators.created = created?.count || 0

      // Recently viewed (can be tracked via logs if needed)
      const viewed: any = await getAsync(
        `SELECT COUNT(DISTINCT document_id) as count FROM document_logs
         WHERE actor_id = ? AND action = 'read' 
         AND datetime(created_at) > datetime('now', '-7 days')`,
        [userId]
      )
      documentIndicators.recentlyViewed = viewed?.count || 0

      // Pending validation for director/admin
      if (user.role === 'direction' || user.role === 'staff') {
        const pending: any = await getAsync(
          `SELECT COUNT(*) as count FROM documents 
           WHERE status = 'in_validation' AND is_deleted = 0`,
          []
        )
        documentIndicators.pendingValidation = pending?.count || 0
      }
    } catch (e) {
      console.log('Document indicators error:', e)
    }

    // Get recent activity
    let recentActivity: any = {
      recentMessages: [],
      recentDocuments: [],
      systemNotifications: []
    }

    try {
      // Recent messages (last 5)
      const messages = await (new Promise((resolve) => {
        const db = (global as any).db
        db.all(
          `SELECT m.id, m.subject, m.sender_id, u.username as sender_username, m.created_at
           FROM messages m
           INNER JOIN users u ON m.sender_id = u.id
           INNER JOIN mailboxes mb ON m.id = mb.message_id
           WHERE mb.user_id = ? AND mb.folder = 'inbox'
           ORDER BY m.created_at DESC LIMIT 5`,
          [userId],
          (err: any, rows: any[]) => {
            if (err) resolve([])
            else resolve(rows || [])
          }
        )
      })) as any[]
      recentActivity.recentMessages = messages

      // Recent accessible documents (last 5)
      const documents = await (new Promise((resolve) => {
        const db = (global as any).db
        db.all(
          `SELECT id, title, type, status, author_id, created_at
           FROM documents
           WHERE is_deleted = 0 AND status = 'published'
           ORDER BY created_at DESC LIMIT 5`,
          [],
          (err: any, rows: any[]) => {
            if (err) resolve([])
            else resolve(rows || [])
          }
        )
      })) as any[]
      recentActivity.recentDocuments = documents
    } catch (e) {
      console.log('Recent activity error:', e)
    }

    // Get announcements (global + department + clearance)
    let announcements = []
    try {
      const db = (global as any).db
      announcements = await (new Promise((resolve) => {
        db.all(
          `SELECT id, title, content, priority, scope, scope_value, valid_from, valid_to, created_at
           FROM announcements
           WHERE (
             scope = 'global'
             OR (scope = 'department' AND scope_value = ?)
             OR (scope = 'clearance' AND CAST(scope_value AS INTEGER) <= ?)
           )
           AND datetime(valid_from) <= datetime('now')
           AND datetime(valid_to) >= datetime('now')
           ORDER BY priority DESC, created_at DESC
           LIMIT 10`,
          [user.department, user.clearance],
          (err: any, rows: any[]) => {
            if (err) {
              console.log('Announcements query error:', err)
              resolve([])
            } else {
              resolve(rows || [])
            }
          }
        )
      })) as any[]
    } catch (e) {
      console.log('Announcements error:', e)
    }

    // Quick actions based on permissions
    const quickActions = [
      { id: 'compose', label: 'Composer un message', icon: 'mail', action: '/mail' },
      { id: 'create-doc', label: 'Créer un document', icon: 'file', action: '/documents' },
      { id: 'annuaire', label: 'Annuaire', icon: 'users', action: '/annuaire' }
    ]

    if (user.role === 'staff' || user.role === 'direction') {
      quickActions.push(
        { id: 'rh', label: 'Gestion RH', icon: 'user-check', action: '/rh' }
      )
    }

    if (user.role === 'staff') {
      quickActions.push(
        { id: 'supervision', label: 'Supervision', icon: 'shield', action: '/supervision' }
      )
    }

    // Get session start time
    const sessionStartTime = new Date().toISOString()

    // Log dashboard access
    try {
      const db = (global as any).db
      if (db) {
        db.run(
          `INSERT INTO logs (action, user_id, details, created_at) 
           VALUES (?, ?, ?, datetime('now'))`,
          ['dashboard_access', userId, JSON.stringify({ ip: (req as any).ip })],
          (err: any) => {
            if (err) console.log('Audit log error:', err)
          }
        )
      }
    } catch (e) {
      console.log('Audit log error:', e)
    }

    // Compose response
    res.json({
      success: true,
      data: {
        userInfo: {
          id: user.id,
          username: user.username,
          role: user.role,
          department: user.department,
          clearance: user.clearance,
          status: user.suspended ? 'suspended' : 'active',
          sessionStartTime
        },
        modulesStatus,
        messagingIndicators,
        documentIndicators,
        recentActivity,
        announcements,
        quickActions
      }
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    res.status(500).json({ error: 'Failed to fetch dashboard data' })
  }
})

export default router
