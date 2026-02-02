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

// Get inbox messages (paginated) - NEW: from mailboxes table
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
        m.id, m.sender_id, m.subject, m.body, 
        mb.is_read, mb.archived, m.priority, mb.folder, m.sender_alias,
        m.thread_id, mb.created_at,
        u.username as sender_username
       FROM mailboxes mb
       JOIN messages m ON m.id = mb.message_id
       JOIN users u ON m.sender_id = u.id
       WHERE mb.user_id = ? AND mb.folder = ? AND mb.deleted = 0
       ORDER BY mb.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user!.id, folder, MESSAGES_PER_PAGE, offset]
    )

    const totalResult = await getAsync<any>(
      `SELECT COUNT(*) as total FROM mailboxes 
       WHERE user_id = ? AND folder = ? AND deleted = 0`,
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

// Get all folders with counts - NEW: from mailboxes table
router.get('/folders', async (req: Request, res: Response) => {
  try {
    const folders = await queryAsync<any>(
      `SELECT folder, COUNT(*) as count 
       FROM mailboxes 
       WHERE user_id = ? AND deleted = 0 
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

// Get unread count - NEW: from mailboxes table
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const result = await getAsync<any>(
      `SELECT COUNT(*) as unread FROM mailboxes 
       WHERE user_id = ? AND is_read = 0 AND deleted = 0 AND folder != 'trash'`,
      [req.user!.id]
    )
    res.json({ unread: result?.unread || 0 })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get single message - NEW: check both sender and recipient in mailboxes
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const msgId = parseInt(req.params.id)
    
    // Check if user has access to this message (via mailboxes)
    const mailbox = await getAsync<any>(
      `SELECT * FROM mailboxes WHERE message_id = ? AND user_id = ?`,
      [msgId, req.user!.id]
    )

    if (!mailbox) {
      return res.status(404).json({ error: 'Message not found' })
    }

    const message = await getAsync<any>(
      `SELECT m.*, u.username as sender_username
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.id = ?`,
      [msgId]
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

// Send message - NEW: transaction with mailboxes table
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
      `SELECT COUNT(*) as count FROM mailboxes mb
       JOIN messages m ON m.id = mb.message_id
       WHERE m.sender_id = ? AND mb.folder = 'sent' AND mb.created_at > datetime(?, 'localtime')`,
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

    // BEGIN TRANSACTION
    const messageId = await runAsync(
      `INSERT INTO messages (sender_id, subject, body, priority, sender_alias)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user!.id, subject, body, priority, sender_alias || null]
    )

    console.log(`✓ Message created: ${messageId}`)

    // Add to sender's sent folder
    await runAsync(
      `INSERT INTO mailboxes (user_id, message_id, folder, is_read)
       VALUES (?, ?, 'sent', 1)`,
      [req.user!.id, messageId]
    )

    console.log(`✓ Added to sender's sent folder`)

    // Add to recipient's inbox folder
    await runAsync(
      `INSERT INTO mailboxes (user_id, message_id, folder, is_read)
       VALUES (?, ?, 'inbox', 0)`,
      [recipient_id, messageId]
    )

    console.log(`✓ Added to recipient's inbox folder`)

    // Add attachments
    if (attachments && attachments.length > 0) {
      for (const docId of attachments) {
        await runAsync(
          `INSERT INTO message_attachments (message_id, document_id) VALUES (?, ?)`,
          [messageId, docId]
        )
      }
    }

    await logAction('MSG_SEND', req.user!.id, `To: user_id ${recipient_id}`, getIpAddress(req))

    res.status(201).json({ id: messageId, message: 'Message sent successfully' })
  } catch (error) {
    console.error('❌ Error sending message:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Reply to message
router.post('/:id/reply', async (req: Request, res: Response) => {
  try {
    const originalId = parseInt(req.params.id)
    const { body, priority = 'information' } = req.body

    if (!body) {
      return res.status(400).json({ error: 'Message body is required' })
    }

    // Get original message
    const original = await getAsync<any>(
      `SELECT m.* FROM messages m
       JOIN mailboxes mb ON m.id = mb.message_id
       WHERE m.id = ? AND mb.user_id = ?`,
      [originalId, req.user!.id]
    )

    if (!original) {
      return res.status(404).json({ error: 'Original message not found' })
    }

    // Determine recipient (if user is recipient, reply to sender; if user is sender, reply to recipient)
    // Actually in the new model we don't have recipient_id in messages, so check the mailbox folder
    const mailbox = await getAsync<any>(
      `SELECT * FROM mailboxes WHERE message_id = ? AND user_id = ?`,
      [originalId, req.user!.id]
    )

    // Recipient is the sender of the original message (reply to them)
    const recipient_id = original.sender_id

    // Create reply message with thread_id
    const replyId = await runAsync(
      `INSERT INTO messages (sender_id, subject, body, priority, thread_id)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user!.id, `RE: ${original.subject}`, body, priority, original.thread_id || originalId]
    )

    console.log(`✓ Reply created: ${replyId}`)

    // Add to sender's sent folder
    await runAsync(
      `INSERT INTO mailboxes (user_id, message_id, folder, is_read)
       VALUES (?, ?, 'sent', 1)`,
      [req.user!.id, replyId]
    )

    // Add to recipient's inbox folder
    await runAsync(
      `INSERT INTO mailboxes (user_id, message_id, folder, is_read)
       VALUES (?, ?, 'inbox', 0)`,
      [recipient_id, replyId]
    )

    await logAction('MSG_REPLY', req.user!.id, `To: user_id ${recipient_id}`, getIpAddress(req))

    res.status(201).json({ id: replyId, message: 'Reply sent successfully' })
  } catch (error) {
    console.error('❌ Error replying to message:', error)
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

// Mark as read - NEW: update mailboxes table
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const msgId = parseInt(req.params.id)
    
    await runAsync(
      `UPDATE mailboxes SET is_read = 1 WHERE message_id = ? AND user_id = ?`,
      [msgId, req.user!.id]
    )

    res.json({ message: 'Marked as read' })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Mark as unread - NEW: update mailboxes table
router.patch('/:id/unread', async (req: Request, res: Response) => {
  try {
    const msgId = parseInt(req.params.id)
    
    await runAsync(
      `UPDATE mailboxes SET is_read = 0 WHERE message_id = ? AND user_id = ?`,
      [msgId, req.user!.id]
    )

    res.json({ message: 'Marked as unread' })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Move to folder - NEW: update mailboxes table
router.patch('/:id/folder', async (req: Request, res: Response) => {
  try {
    const msgId = parseInt(req.params.id)
    const { folder } = req.body

    if (!FOLDERS.includes(folder)) {
      return res.status(400).json({ error: 'Invalid folder' })
    }

    // Check ownership in mailboxes
    const mailbox = await getAsync<any>(
      `SELECT * FROM mailboxes WHERE message_id = ? AND user_id = ?`,
      [msgId, req.user!.id]
    )

    if (!mailbox) {
      return res.status(404).json({ error: 'Message not found or permission denied' })
    }

    // Update folder
    await runAsync(
      `UPDATE mailboxes SET folder = ? WHERE message_id = ? AND user_id = ?`,
      [folder, msgId, req.user!.id]
    )

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
