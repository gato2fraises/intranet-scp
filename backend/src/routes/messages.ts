import { Router, Request, Response } from 'express'
import { authMiddleware, getIpAddress } from '../auth'
import { queryAsync, getAsync, runAsync, logAction } from '../utils'

const router = Router()

router.use(authMiddleware)

// Get inbox
router.get('/inbox', async (req: Request, res: Response) => {
  try {
    const messages = await queryAsync<any>(
      `SELECT m.*, u.username as sender_name FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.recipient_id = ? AND m.archived = 0
       ORDER BY m.created_at DESC`,
      [req.user!.id]
    )

    res.json(messages)
  } catch (error) {
    console.error('Error fetching messages:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Send message
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { recipient_id, subject, body } = req.body

    if (!recipient_id || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const msgId = await runAsync(
      `INSERT INTO messages (sender_id, recipient_id, subject, body)
       VALUES (?, ?, ?, ?)`,
      [req.user!.id, recipient_id, subject, body]
    )

    await logAction('MSG_SEND', req.user!.id, `To: user_id ${recipient_id}`, getIpAddress(req))

    res.status(201).json({ id: msgId, message: 'Message sent' })
  } catch (error) {
    console.error('Error sending message:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Mark as read
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    await runAsync(
      'UPDATE messages SET is_read = 1 WHERE id = ? AND recipient_id = ?',
      [req.params.id, req.user!.id]
    )

    res.json({ message: 'Message marked as read' })
  } catch (error) {
    console.error('Error marking message as read:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Archive message
router.patch('/:id/archive', async (req: Request, res: Response) => {
  try {
    await runAsync(
      'UPDATE messages SET archived = 1 WHERE id = ?',
      [req.params.id]
    )

    res.json({ message: 'Message archived' })
  } catch (error) {
    console.error('Error archiving message:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
