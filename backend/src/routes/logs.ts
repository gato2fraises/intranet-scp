import { Router, Request, Response } from 'express'
import { authMiddleware } from '../auth'
import { queryAsync } from '../utils'

const router = Router()

router.use(authMiddleware)

// Get logs (Admin/Staff only)
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!['staff', 'admin', 'direction'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Admin or Staff only' })
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000)
    const offset = parseInt(req.query.offset as string) || 0
    const action = req.query.action as string || null

    let query = `SELECT l.*, u.username FROM logs l
       LEFT JOIN users u ON l.user_id = u.id`
    let params: any[] = []

    if (action) {
      query += ` WHERE l.action = ?`
      params.push(action)
    }

    query += ` ORDER BY l.created_at DESC LIMIT ? OFFSET ?`
    params.push(limit, offset)

    const logs = await queryAsync<any>(query, params)

    res.json(logs)
  } catch (error) {
    console.error('Error fetching logs:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
