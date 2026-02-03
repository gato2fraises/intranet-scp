import { Router, Request, Response } from 'express'
import sqlite3 from 'sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import { authMiddleware, getIpAddress } from '../auth'
import { queryAsync, getAsync, runAsync } from '../utils'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const router = Router()
router.use(authMiddleware)

// Initialize database connection
const db = new sqlite3.Database(path.join(__dirname, '../../data/intranet.db'))

// Helper: Check if user can access document
async function canAccessDocument(userId: number, docId: number): Promise<boolean> {
  try {
    const doc = await getAsync<any>(
      'SELECT clearance, author_id, is_deleted FROM documents WHERE id = ?',
      [docId]
    )

    if (!doc || doc.is_deleted) return false

    // Get user info
    const user = await getAsync<any>(
      'SELECT role, clearance, department FROM users WHERE id = ?',
      [userId]
    )

    if (!user) return false

    // Admin can access everything
    if (user.role === 'staff') return true

    // Check clearance
    if (user.clearance < doc.clearance) return false

    // Check permissions
    const perms = await queryAsync<any>(
      'SELECT permission_type, target_id, is_allowed FROM document_permissions WHERE document_id = ?',
      [docId]
    )

    // Blacklist takes priority
    const blacklist = perms.filter((p) => p.permission_type === 'blacklist')
    if (blacklist.some((p) => p.target_id === String(userId) || p.target_id === user.role || p.target_id === user.department))
      return false

    // Check whitelist
    const whitelist = perms.filter((p) => p.permission_type === 'whitelist')
    if (whitelist.length > 0) {
      return whitelist.some((p) => p.target_id === String(userId) || p.target_id === user.role || p.target_id === user.department)
    }

    // Check role/department
    const rolePerms = perms.filter((p) => p.permission_type === 'role' || p.permission_type === 'department')
    if (rolePerms.length > 0) {
      return rolePerms.some((p) => p.target_id === user.role || p.target_id === user.department)
    }

    return true
  } catch (error) {
    console.error('Error checking access:', error)
    return false
  }
}

// Helper: Log document action
async function logAction(
  docId: number,
  action: string,
  actorId: number,
  details?: string,
  ip?: string
): Promise<void> {
  try {
    await runAsync(
      'INSERT INTO document_logs (document_id, action, actor_id, details, ip_address) VALUES (?, ?, ?, ?, ?)',
      [docId, action, actorId, details || null, ip || null]
    )
  } catch (error) {
    console.error('Error logging action:', error)
  }
}

// GET /api/documents - List accessible documents with filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id
    const { search, type, department, status, clearance, page = '0' } = req.query
    const pageNum = parseInt(page as string) || 0
    const pageSize = 50
    const offset = pageNum * pageSize

    let query =
      `SELECT d.id, d.title, d.type, d.status, d.author_id, d.department, d.clearance, d.version, 
              d.created_at, d.updated_at, d.tags, u.username as author_username
       FROM documents d
       JOIN users u ON d.author_id = u.id
       WHERE d.is_deleted = 0`

    const params: any[] = []

    // Apply filters
    if (search) {
      query += ` AND (d.title LIKE ? OR d.tags LIKE ?)`
      params.push(`%${search}%`, `%${search}%`)
    }

    if (type) {
      query += ` AND d.type = ?`
      params.push(type)
    }

    if (department) {
      query += ` AND d.department = ?`
      params.push(department)
    }

    if (status) {
      query += ` AND d.status = ?`
      params.push(status)
    }

    if (clearance) {
      query += ` AND d.clearance <= ?`
      params.push(parseInt(clearance as string))
    }

    query += ` ORDER BY d.created_at DESC LIMIT ? OFFSET ?`
    params.push(pageSize, offset)

    const docs = await queryAsync<any>(query, params)

    // Filter by access rights
    const accessible = []
    for (const doc of docs) {
      const canAccess = await canAccessDocument(userId, doc.id)
      if (canAccess) {
        accessible.push({
          ...doc,
          tags: JSON.parse(doc.tags || '[]'),
        })
      }
    }

    res.json({ documents: accessible, page: pageNum, pageSize, total: accessible.length })
  } catch (error) {
    console.error('Error GET /documents:', error)
    res.status(500).json({ error: String(error) })
  }
})

// GET /api/documents/:id - Get single document
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id
    const docId = parseInt(req.params.id)

    const canAccess = await canAccessDocument(userId, docId)
    if (!canAccess) {
      await logAction(docId, 'access_denied', userId, undefined, getIpAddress(req))
      return res.status(403).json({ error: 'Document access denied' })
    }

    const doc = await getAsync<any>(
      `SELECT d.*, u.username as author_username
       FROM documents d
       JOIN users u ON d.author_id = u.id
       WHERE d.id = ? AND d.is_deleted = 0`,
      [docId]
    )

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' })
    }

    // Log read access
    await logAction(docId, 'read', userId, undefined, getIpAddress(req))

    res.json({
      ...doc,
      tags: JSON.parse(doc.tags || '[]'),
    })
  } catch (error) {
    console.error('Error GET /documents/:id:', error)
    res.status(500).json({ error: String(error) })
  }
})

// POST /api/documents - Create document
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id
    const user = await getAsync<any>('SELECT role, clearance FROM users WHERE id = ?', [userId])

    // Check creation rights
    const creatorRoles = ['scientifique', 'securite', 'administration', 'direction', 'staff']
    if (!creatorRoles.includes(user?.role)) {
      return res.status(403).json({ error: 'Not authorized to create documents' })
    }

    const { title, body, type, department, clearance, tags, reference_id } = req.body

    if (!title || !body || !type || !department) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const docId = await new Promise<number>((resolve, reject) => {
      const stmt = db.prepare(
        `INSERT INTO documents (title, body, type, author_id, department, clearance, status, tags, reference_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      stmt.run(
        title,
        body,
        type,
        userId,
        department,
        clearance || 0,
        'draft',
        JSON.stringify(tags || []),
        reference_id || null,
        function (this: any, err: Error | null) {
          if (err) reject(err)
          else resolve(this.lastID as number)
        }
      )
      stmt.finalize()
    })

    // Create initial version
    await runAsync(
      `INSERT INTO document_versions (document_id, version, title, body, edited_by, change_summary)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [docId, 1, title, body, userId, 'Initial version']
    )

    // Log creation
    await logAction(docId, 'created', userId, `Created by ${user.role}`, getIpAddress(req))

    res.status(201).json({ id: docId, status: 'draft' })
  } catch (error) {
    console.error('Error POST /documents:', error)
    res.status(500).json({ error: String(error) })
  }
})

// PATCH /api/documents/:id - Edit document
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id
    const docId = parseInt(req.params.id)
    const user = await getAsync<any>('SELECT role, clearance FROM users WHERE id = ?', [userId])

    const doc = await getAsync<any>('SELECT author_id, status FROM documents WHERE id = ? AND is_deleted = 0', [docId])
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' })
    }

    // Check edit rights
    const isAuthor = doc.author_id === userId
    const isAdmin = user?.role === 'staff'
    const isDirector = user?.role === 'direction'

    if (!isAuthor && !isAdmin && !isDirector) {
      return res.status(403).json({ error: 'Not authorized to edit document' })
    }

    if (isAuthor && doc.status !== 'draft') {
      return res.status(403).json({ error: 'Can only edit draft documents' })
    }

    const { title, body, type, department, clearance, tags, reference_id, change_summary } = req.body

    // Get current version
    const currentVersion = await getAsync<any>(
      'SELECT version FROM documents WHERE id = ?',
      [docId]
    )
    const newVersion = (currentVersion?.version || 1) + 1

    // Update document
    await runAsync(
      `UPDATE documents SET title = ?, body = ?, type = ?, department = ?, clearance = ?, tags = ?, reference_id = ?, version = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        title || doc.title,
        body || doc.body,
        type || 'note_interne',
        department || 'general',
        clearance ?? 0,
        JSON.stringify(tags || []),
        reference_id || null,
        newVersion,
        docId,
      ]
    )

    // Create version entry
    await runAsync(
      `INSERT INTO document_versions (document_id, version, title, body, edited_by, change_summary)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [docId, newVersion, title || doc.title, body || doc.body, userId, change_summary || 'Modified']
    )

    // Log edit
    await logAction(docId, 'edited', userId, `Version ${newVersion}`, getIpAddress(req))

    res.json({ id: docId, version: newVersion })
  } catch (error) {
    console.error('Error PATCH /documents/:id:', error)
    res.status(500).json({ error: String(error) })
  }
})

// POST /api/documents/:id/publish - Publish document
router.post('/:id/publish', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id
    const docId = parseInt(req.params.id)
    const user = await getAsync<any>('SELECT role FROM users WHERE id = ?', [userId])

    const doc = await getAsync<any>('SELECT author_id, status FROM documents WHERE id = ? AND is_deleted = 0', [docId])
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' })
    }

    // Check rights
    if (doc.author_id !== userId && user?.role !== 'direction' && user?.role !== 'staff') {
      return res.status(403).json({ error: 'Not authorized to publish document' })
    }

    if (doc.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft documents can be published' })
    }

    await runAsync('UPDATE documents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      'published',
      docId,
    ])

    await logAction(docId, 'published', userId, undefined, getIpAddress(req))

    res.json({ id: docId, status: 'published' })
  } catch (error) {
    console.error('Error POST /documents/:id/publish:', error)
    res.status(500).json({ error: String(error) })
  }
})

// POST /api/documents/:id/archive - Archive document
router.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id
    const docId = parseInt(req.params.id)
    const user = await getAsync<any>('SELECT role FROM users WHERE id = ?', [userId])

    const doc = await getAsync<any>('SELECT author_id FROM documents WHERE id = ? AND is_deleted = 0', [docId])
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' })
    }

    // Check rights
    if (doc.author_id !== userId && user?.role !== 'direction' && user?.role !== 'staff') {
      return res.status(403).json({ error: 'Not authorized to archive document' })
    }

    await runAsync('UPDATE documents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      'archived',
      docId,
    ])

    await logAction(docId, 'archived', userId, undefined, getIpAddress(req))

    res.json({ id: docId, status: 'archived' })
  } catch (error) {
    console.error('Error POST /documents/:id/archive:', error)
    res.status(500).json({ error: String(error) })
  }
})

// DELETE /api/documents/:id - Soft delete document
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id
    const docId = parseInt(req.params.id)
    const user = await getAsync<any>('SELECT role FROM users WHERE id = ?', [userId])

    const doc = await getAsync<any>('SELECT author_id FROM documents WHERE id = ? AND is_deleted = 0', [docId])
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' })
    }

    // Check rights - only author or admin can delete
    if (doc.author_id !== userId && user?.role !== 'staff') {
      return res.status(403).json({ error: 'Not authorized to delete document' })
    }

    await runAsync('UPDATE documents SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [docId])

    await logAction(docId, 'deleted', userId, undefined, getIpAddress(req))

    res.json({ id: docId, deleted: true })
  } catch (error) {
    console.error('Error DELETE /documents/:id:', error)
    res.status(500).json({ error: String(error) })
  }
})

// GET /api/documents/:id/versions - Get document versions
router.get('/:id/versions', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id
    const docId = parseInt(req.params.id)

    const canAccess = await canAccessDocument(userId, docId)
    if (!canAccess) {
      return res.status(403).json({ error: 'Document access denied' })
    }

    const versions = await queryAsync<any>(
      `SELECT dv.*, u.username as edited_by_username
       FROM document_versions dv
       LEFT JOIN users u ON dv.edited_by = u.id
       WHERE dv.document_id = ?
       ORDER BY dv.version DESC`,
      [docId]
    )

    res.json({ versions })
  } catch (error) {
    console.error('Error GET /documents/:id/versions:', error)
    res.status(500).json({ error: String(error) })
  }
})

// POST /api/documents/:id/permissions - Set document permissions
router.post('/:id/permissions', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id
    const docId = parseInt(req.params.id)
    const user = await getAsync<any>('SELECT role FROM users WHERE id = ?', [userId])

    // Check rights - only document author or admin
    const doc = await getAsync<any>('SELECT author_id FROM documents WHERE id = ?', [docId])
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' })
    }

    if (doc.author_id !== userId && user?.role !== 'staff') {
      return res.status(403).json({ error: 'Not authorized to modify permissions' })
    }

    const { permission_type, target_id, is_allowed } = req.body

    if (!permission_type || !target_id) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Remove existing permission
    await runAsync(
      'DELETE FROM document_permissions WHERE document_id = ? AND permission_type = ? AND target_id = ?',
      [docId, permission_type, target_id]
    )

    // Add new permission
    if (is_allowed !== false) {
      await runAsync(
        'INSERT INTO document_permissions (document_id, permission_type, target_id, is_allowed) VALUES (?, ?, ?, ?)',
        [docId, permission_type, target_id, 1]
      )
    }

    await logAction(docId, 'permission_changed', userId, `${permission_type}:${target_id}`, getIpAddress(req))

    res.json({ id: docId, permission: { permission_type, target_id, is_allowed } })
  } catch (error) {
    console.error('Error POST /documents/:id/permissions:', error)
    res.status(500).json({ error: String(error) })
  }
})

// GET /api/documents/:id/permissions - Get document permissions
router.get('/:id/permissions', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id
    const docId = parseInt(req.params.id)
    const user = await getAsync<any>('SELECT role FROM users WHERE id = ?', [userId])

    const doc = await getAsync<any>('SELECT author_id FROM documents WHERE id = ?', [docId])
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' })
    }

    // Only author or admin can view permissions
    if (doc.author_id !== userId && user?.role !== 'staff') {
      return res.status(403).json({ error: 'Not authorized to view permissions' })
    }

    const permissions = await queryAsync<any>(
      'SELECT * FROM document_permissions WHERE document_id = ? ORDER BY permission_type, target_id',
      [docId]
    )

    res.json({ permissions })
  } catch (error) {
    console.error('Error GET /documents/:id/permissions:', error)
    res.status(500).json({ error: String(error) })
  }
})

// GET /api/documents/:id/logs - Get document audit logs
router.get('/:id/logs', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id
    const docId = parseInt(req.params.id)
    const user = await getAsync<any>('SELECT role FROM users WHERE id = ?', [userId])

    const doc = await getAsync<any>('SELECT author_id FROM documents WHERE id = ?', [docId])
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' })
    }

    // Only author, director or admin can view logs
    if (doc.author_id !== userId && user?.role !== 'direction' && user?.role !== 'staff') {
      return res.status(403).json({ error: 'Not authorized to view logs' })
    }

    const logs = await queryAsync<any>(
      `SELECT dl.*, u.username as actor_username
       FROM document_logs dl
       LEFT JOIN users u ON dl.actor_id = u.id
       WHERE dl.document_id = ?
       ORDER BY dl.created_at DESC
       LIMIT 100`,
      [docId]
    )

    res.json({ logs })
  } catch (error) {
    console.error('Error GET /documents/:id/logs:', error)
    res.status(500).json({ error: String(error) })
  }
})

export default router
