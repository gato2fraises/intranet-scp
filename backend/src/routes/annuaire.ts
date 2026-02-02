import { Router, Request, Response } from 'express'
import { authMiddleware } from '../auth'
import { queryAsync } from '../utils'

const router = Router()

router.use(authMiddleware)

// GET /api/annuaire - Get all active users for directory
router.get('/', async (req: Request, res: Response) => {
  try {
    const users = await queryAsync<any>(
      `SELECT id, username, role, clearance, department, suspended
       FROM users
       WHERE suspended = 0
       ORDER BY username ASC`
    )
    res.json(users)
  } catch (error) {
    console.error('Error fetching annuaire:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/annuaire/search - Search users
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query
    const searchQuery = `%${q || ''}%`
    
    const users = await queryAsync<any>(
      `SELECT id, username, role, clearance, department, suspended
       FROM users
       WHERE suspended = 0
         AND (username LIKE ? OR department LIKE ?)
       ORDER BY username ASC`,
      [searchQuery, searchQuery]
    )
    res.json(users)
  } catch (error) {
    console.error('Error searching annuaire:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
