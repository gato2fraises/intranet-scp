import { Router, Request, Response } from 'express'
import { authMiddleware, getIpAddress } from '../auth'
import { queryAsync, getAsync, runAsync, logAction } from '../utils'

const router = Router()

router.use(authMiddleware)

// Constants
const MESSAGES_PER_PAGE = 20
const MAX_MESSAGES_PER_DAY = 50
const PRIORITY_LEVELS = ['information', 'alerte', 'critique']
const FOLDERS = ['inbox', 'sent', 'drafts', 'archived', 'trash']

// Get inbox messages (paginated)
router.get('/inbox', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 0
    const folder = (req.query.folder as string) || 'inbox'
    
    console.log(`📨 Fetching messages for user: ${req.user?.id}, folder: ${folder}, page: ${page}`)

    // Validate folder
    if (!FOLDERS.includes(folder)) {
      return res.status(400).json({ error: 'Invalid folder' })
    }

    const offset = page * MESSAGES_PER_PAGE

    const messages = await queryAsync<any>(
      `SELECT 
        m.id, m.sender_id, m.recipient_id, m.subject, m.body, 
        m.is_read, m.archived, m.priority, m.folder, m.sender_alias,
        m.thread_id, m.created_at, m.updated_at,
        u.username as sender_username
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.recipient_id = ? AND m.folder = ? AND m.deleted = 0
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user!.id, folder, MESSAGES_PER_PAGE, offset]
    )

    const totalResult = await getAsync<any>(
      `SELECT COUNT(*) as total FROM messages 
       WHERE recipient_id = ? AND folder = ? AND deleted = 0`,
      [req.user!.id, folder]
    )

    console.log(`✓ Found ${messages.length} messages`)

    // Transform to add sender object
    const formattedMessages = messages.map((m: any) => ({
      ...m,
      sender: { username: m.sender_username },
      sender_username: undefined
    }))

    res.json({
      messages: formattedMessages,
      total: totalResult?.total || 0,
      page,
      pages: Math.ceil((totalResult?.total || 0) / MESSAGES_PER_PAGE)
    })
  } catch (error) {
    console.error('❌ Error fetching messages:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get all folders with counts
router.get('/folders', async (req: Request, res: Response) => {
  try {
    const folders = await queryAsync<any>(
      `SELECT folder, COUNT(*) as count 
       FROM messages 
       WHERE recipient_id = ? AND deleted = 0 
       GROUP BY folder`,
      [req.user!.id]
    )

    const folderCounts: Record<string, number> = {}
    FOLDERS.forEach(f => folderCounts[f] = 0)
    folders.forEach(f => folderCounts[f.folder] = f.count)

    res.json(folderCounts)
  } catch (error) {
    console.error('Error fetching folders:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get unread count
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const result = await getAsync<any>(
      `SELECT COUNT(*) as unread FROM messages 
       WHERE recipient_id = ? AND is_read = 0 AND deleted = 0 AND folder != 'trash'`,
      [req.user!.id]
    )
    res.json({ unread: result?.unread || 0 })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get single message
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const msgId = parseInt(req.params.id)
    
    const message = await getAsync<any>(
      `SELECT m.*, u.username as sender_username
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.id = ? AND (m.recipient_id = ? OR m.sender_id = ?)`,
      [msgId, req.user!.id, req.user!.id]
    )

    if (!message) {
      return res.status(404).json({ error: 'Message not found' })
    }

    // Get attachments
    const attachments = await queryAsync<any>(
      `SELECT d.id, d.title FROM message_attachments ma
       JOIN documents d ON ma.document_id = d.id
       WHERE ma.message_id = ?`,
      [msgId]
    )

    res.json({
      ...message,
      sender: { username: message.sender_username },
      sender_username: undefined,
      attachments
    })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Send message
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { recipient_id, subject, body, priority = 'information', sender_alias, attachments = [] } = req.body

    if (!recipient_id || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Check message restrictions
    const restriction = await getAsync<any>(
      `SELECT * FROM user_message_restrictions 
       WHERE user_id = ? AND restriction_type = 'send_blocked' AND (blocked_until IS NULL OR blocked_until > CURRENT_TIMESTAMP)`,
      [req.user!.id]
    )

    if (restriction) {
      return res.status(403).json({ error: 'Messagerie temporarily disabled: ' + restriction.reason })
    }

    // Check daily limit
    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)
    const dailyCount = await getAsync<any>(
      `SELECT COUNT(*) as count FROM messages 
       WHERE sender_id = ? AND is_draft = 0 AND created_at > datetime(?, 'localtime')`,
      [req.user!.id, dayStart.toISOString()]
    )

    if ((dailyCount?.count || 0) >= MAX_MESSAGES_PER_DAY) {
      return res.status(429).json({ error: 'Daily message limit reached' })
    }

    // Validate priority
    if (!PRIORITY_LEVELS.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority level' })
    }

    // Validate alias if provided
    if (sender_alias) {
      const aliasCheck = await getAsync<any>(
        `SELECT ua.* FROM user_alias_permissions ua
         JOIN message_aliases ma ON ua.alias_id = ma.id
         WHERE ua.user_id = ? AND ma.id = ? AND ma.enabled = 1`,
        [req.user!.id, sender_alias]
      )

      if (!aliasCheck) {
        return res.status(403).json({ error: 'Not authorized to use this alias' })
      }
    }

    const msgId = await runAsync(
      `INSERT INTO messages (sender_id, recipient_id, subject, body, priority, sender_alias, folder)
       VALUES (?, ?, ?, ?, ?, ?, 'sent')`,
      [req.user!.id, recipient_id, subject, body, priority, sender_alias || null]
    )

    // Add to recipient's inbox
    await runAsync(
      `INSERT INTO messages (sender_id, recipient_id, subject, body, priority, sender_alias, folder, thread_id)
       VALUES (?, ?, ?, ?, ?, ?, 'inbox', ?)`,
      [req.user!.id, recipient_id, subject, body, priority, sender_alias || null, msgId]
    )

    // Add attachments
    if (attachments && attachments.length > 0) {
      for (const docId of attachments) {
        await runAsync(
          `INSERT INTO message_attachments (message_id, document_id) VALUES (?, ?)`,
          [msgId, docId]
        )
      }
    }

    await logAction('MSG_SEND', req.user!.id, `To: user_id ${recipient_id}`, getIpAddress(req))

    res.status(201).json({ id: msgId, message: 'Message sent successfully' })
  } catch (error) {
    console.error('Error sending message:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Save draft
router.post('/draft', async (req: Request, res: Response) => {
  try {
    const { id, recipient_id, subject, body, priority = 'information' } = req.body

    if (!recipient_id || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    if (id) {
      // Update existing draft
      await runAsync(
        `UPDATE messages SET recipient_id = ?, subject = ?, body = ?, priority = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND sender_id = ? AND is_draft = 1`,
        [recipient_id, subject, body, priority, id, req.user!.id]
      )
      res.json({ id, message: 'Draft updated' })
    } else {
      // Create new draft
      const msgId = await runAsync(
        `INSERT INTO messages (sender_id, recipient_id, subject, body, priority, is_draft, folder)
         VALUES (?, ?, ?, ?, ?, 1, 'drafts')`,
        [req.user!.id, recipient_id, subject, body, priority]
      )
      res.status(201).json({ id: msgId, message: 'Draft saved' })
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Mark as read
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const msgId = parseInt(req.params.id)
    
    await runAsync(
      `UPDATE messages SET is_read = 1 WHERE id = ? AND recipient_id = ?`,
      [msgId, req.user!.id]
    )

    res.json({ message: 'Marked as read' })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Mark as unread
router.patch('/:id/unread', async (req: Request, res: Response) => {
  try {
    const msgId = parseInt(req.params.id)
    
    await runAsync(
      `UPDATE messages SET is_read = 0 WHERE id = ? AND recipient_id = ?`,
      [msgId, req.user!.id]
    )

    res.json({ message: 'Marked as unread' })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Move to folder
router.patch('/:id/folder', async (req: Request, res: Response) => {
  try {
    const msgId = parseInt(req.params.id)
    const { folder } = req.body

    if (!FOLDERS.includes(folder)) {
      return res.status(400).json({ error: 'Invalid folder' })
    }

    // Check ownership
    const msg = await getAsync<any>(
      `SELECT * FROM messages WHERE id = ? AND (recipient_id = ? OR sender_id = ?)`,
      [msgId, req.user!.id, req.user!.id]
    )

    if (!msg) {
      return res.status(404).json({ error: 'Message not found' })
    }

    // For sent/drafts, use sender_id; for inbox/archived/trash, use recipient_id
    const isOwner = msg.sender_id === req.user!.id && ['sent', 'drafts'].includes(folder)
                  || msg.recipient_id === req.user!.id && ['inbox', 'archived', 'trash'].includes(folder)

    if (!isOwner && msg.recipient_id === req.user!.id) {
      // Can move received messages
      await runAsync(
        `UPDATE messages SET folder = ? WHERE id = ? AND recipient_id = ?`,
        [folder, msgId, req.user!.id]
      )
    } else if (msg.sender_id === req.user!.id) {
      // Can move sent messages
      await runAsync(
        `UPDATE messages SET folder = ? WHERE id = ? AND sender_id = ?`,
        [folder, msgId, req.user!.id]
      )
    } else {
      return res.status(403).json({ error: 'Permission denied' })
    }

    res.json({ message: 'Message moved' })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete message (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const msgId = parseInt(req.params.id)
    
    const msg = await getAsync<any>(
      `SELECT * FROM messages WHERE id = ? AND (recipient_id = ? OR sender_id = ?)`,
      [msgId, req.user!.id, req.user!.id]
    )

    if (!msg) {
      return res.status(404).json({ error: 'Message not found' })
    }

    // Soft delete
    await runAsync(
      `UPDATE messages SET deleted = 1 WHERE id = ?`,
      [msgId]
    )

    await logAction('MSG_DELETE', req.user!.id, `Message: ${msgId}`, getIpAddress(req))

    res.json({ message: 'Message deleted' })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Search messages
router.get('/search/query', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || ''
    const folder = (req.query.folder as string) || 'inbox'

    if (query.length < 2) {
      return res.status(400).json({ error: 'Search query too short' })
    }

    const results = await queryAsync<any>(
      `SELECT m.*, u.username as sender_username
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE (m.recipient_id = ? OR m.sender_id = ?)
       AND (m.subject LIKE ? OR m.body LIKE ?)
       AND m.folder = ?
       AND m.deleted = 0
       ORDER BY m.created_at DESC
       LIMIT 50`,
      [req.user!.id, req.user!.id, `%${query}%`, `%${query}%`, folder]
    )

    const formatted = results.map(m => ({
      ...m,
      sender: { username: m.sender_username },
      sender_username: undefined
    }))

    res.json(formatted)
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
