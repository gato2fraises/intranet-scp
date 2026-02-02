import { Router, Request, Response } from 'express'
import { authMiddleware, getIpAddress } from '../auth'
import { queryAsync, getAsync, runAsync, logAction } from '../utils'

const router = Router()

router.use(authMiddleware)

// Get user restrictions
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId)

    // Admin only
    const user = await getAsync<any>(
      `SELECT role FROM users WHERE id = ?`,
      [req.user!.id]
    )

    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can view restrictions' })
    }

    const restrictions = await queryAsync<any>(
      `SELECT * FROM user_message_restrictions WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    )

    res.json(restrictions)
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Add restriction (admin only)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { user_id, restriction_type, reason, hours = null } = req.body

    if (!user_id || !restriction_type) {
      return res.status(400).json({ error: 'user_id and restriction_type required' })
    }

    // Admin only
    const user = await getAsync<any>(
      `SELECT role FROM users WHERE id = ?`,
      [req.user!.id]
    )

    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can add restrictions' })
    }

    let blockedUntil = null
    if (hours) {
      const date = new Date()
      date.setHours(date.getHours() + hours)
      blockedUntil = date.toISOString()
    }

    const id = await runAsync(
      `INSERT INTO user_message_restrictions (user_id, restriction_type, reason, blocked_until, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, restriction_type, reason || null, blockedUntil, req.user!.id]
    )

    await logAction('RESTRICTION_ADD', req.user!.id, `User ${user_id}: ${restriction_type}`, getIpAddress(req))

    res.status(201).json({ id, message: 'Restriction added' })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Remove restriction (admin only)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id)

    // Admin only
    const user = await getAsync<any>(
      `SELECT role FROM users WHERE id = ?`,
      [req.user!.id]
    )

    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can remove restrictions' })
    }

    const restriction = await getAsync<any>(
      `SELECT * FROM user_message_restrictions WHERE id = ?`,
      [id]
    )

    if (!restriction) {
      return res.status(404).json({ error: 'Restriction not found' })
    }

    await runAsync(
      `DELETE FROM user_message_restrictions WHERE id = ?`,
      [id]
    )

    await logAction('RESTRICTION_REMOVE', req.user!.id, `Restriction: ${id}`, getIpAddress(req))

    res.json({ message: 'Restriction removed' })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
