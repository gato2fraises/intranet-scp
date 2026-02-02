import { Router, Request, Response } from 'express'
import { authMiddleware, getIpAddress } from '../auth'
import { queryAsync, getAsync, runAsync, logAction } from '../utils'
import { Document } from '../types'

const router = Router()

router.use(authMiddleware)

// Get all accessible documents
router.get('/', async (req: Request, res: Response) => {
  try {
    const docs = await queryAsync<any>(
      `SELECT d.*, u.username as author_name FROM documents d
       JOIN users u ON d.author_id = u.id
       WHERE d.clearance <= ? AND d.archived = 0
       ORDER BY d.created_at DESC`,
      [req.user!.clearance || 0]
    )

    res.json({ documents: docs })
    await logAction('DOC_LIST', req.user!.id, null, getIpAddress(req))
  } catch (error) {
    console.error('Error fetching documents:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get single document
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const doc = await getAsync<any>(
      `SELECT d.*, u.username as author_name FROM documents d
       JOIN users u ON d.author_id = u.id
       WHERE d.id = ? AND d.clearance <= ? AND d.archived = 0`,
      [req.params.id, req.user!.clearance || 0]
    )

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' })
    }

    res.json(doc)
    await logAction('DOC_READ', req.user!.id, `Doc: ${doc.title}`, getIpAddress(req))
  } catch (error) {
    console.error('Error fetching document:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create document (requires admin+ clearance)
router.post('/', async (req: Request, res: Response) => {
  try {
    if (req.user!.clearance < 3) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const { title, body, type, clearance } = req.body

    if (!title || !body || !type) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const docId = await runAsync(
      `INSERT INTO documents (title, body, type, clearance, author_id)
       VALUES (?, ?, ?, ?, ?)`,
      [title, body, type, clearance || 1, req.user!.id]
    )

    await logAction('DOC_CREATE', req.user!.id, `Doc: ${title}`, getIpAddress(req))

    res.status(201).json({ id: docId, message: 'Document created' })
  } catch (error) {
    console.error('Error creating document:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Archive document (Admin+ clearance)
router.patch('/:id/archive', async (req: Request, res: Response) => {
  try {
    if (req.user!.clearance < 3 && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const doc = await getAsync('SELECT title FROM documents WHERE id = ?', [req.params.id]) as any
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' })
    }

    await runAsync(
      'UPDATE documents SET archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [req.params.id]
    )

    await logAction('DOC_ARCHIVE', req.user!.id, `Doc: ${doc.title}`, getIpAddress(req))

    res.json({ message: 'Document archived' })
  } catch (error) {
    console.error('Error archiving document:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Restore document (Admin+ only)
router.patch('/:id/restore', async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'admin' && !['direction', 'staff'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const doc = await getAsync('SELECT title FROM documents WHERE id = ?', [req.params.id]) as any
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' })
    }

    await runAsync(
      'UPDATE documents SET archived = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [req.params.id]
    )

    await logAction('DOC_RESTORE', req.user!.id, `Doc: ${doc.title}`, getIpAddress(req))

    res.json({ message: 'Document restored' })
  } catch (error) {
    console.error('Error restoring document:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update document clearance (Admin+ only)
router.patch('/:id/clearance', async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'admin' && !['direction', 'staff'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const { clearance } = req.body
    if (typeof clearance !== 'number' || clearance < 0 || clearance > 6) {
      return res.status(400).json({ error: 'Invalid clearance level' })
    }

    const doc = await getAsync('SELECT title, clearance FROM documents WHERE id = ?', [req.params.id]) as any
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' })
    }

    await runAsync(
      'UPDATE documents SET clearance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [clearance, req.params.id]
    )

    await logAction(
      'DOC_CLEARANCE_UPDATE',
      req.user!.id,
      `Doc: ${doc.title}, From: ${doc.clearance}, To: ${clearance}`,
      getIpAddress(req)
    )

    res.json({ message: 'Document clearance updated' })
  } catch (error) {
    console.error('Error updating clearance:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
