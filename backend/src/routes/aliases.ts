import { Router, Request, Response } from 'express'
import { authMiddleware, getIpAddress } from '../auth'
import { queryAsync, getAsync, runAsync, logAction } from '../utils'

const router = Router()

router.use(authMiddleware)

// Get user aliases
router.get('/', async (req: Request, res: Response) => {
  try {
    const aliases = await queryAsync<any>(
      `SELECT ma.* FROM message_aliases ma
       LEFT JOIN user_alias_permissions uap ON ma.id = uap.alias_id
       WHERE ma.owner_id = ? OR uap.user_id = ?`,
      [req.user!.id, req.user!.id]
    )

    res.json(aliases)
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create alias (admin only)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, admin_only = false } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }

    // Check if user is admin
    const user = await getAsync<any>(
      `SELECT role FROM users WHERE id = ?`,
      [req.user!.id]
    )

    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create aliases' })
    }

    const aliasId = await runAsync(
      `INSERT INTO message_aliases (name, description, owner_id, admin_only)
       VALUES (?, ?, ?, ?)`,
      [name, description || null, req.user!.id, admin_only ? 1 : 0]
    )

    await logAction('ALIAS_CREATE', req.user!.id, `Alias: ${name}`, getIpAddress(req))

    res.status(201).json({ id: aliasId, message: 'Alias created' })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Grant alias permission
router.post('/:aliasId/grant', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body
    const aliasId = parseInt(req.params.aliasId)

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' })
    }

    // Check ownership/admin
    const alias = await getAsync<any>(
      `SELECT * FROM message_aliases WHERE id = ?`,
      [aliasId]
    )

    if (!alias) {
      return res.status(404).json({ error: 'Alias not found' })
    }

    const user = await getAsync<any>(
      `SELECT role FROM users WHERE id = ?`,
      [req.user!.id]
    )

    if (alias.owner_id !== req.user!.id && user?.role !== 'admin') {
      return res.status(403).json({ error: 'Permission denied' })
    }

    await runAsync(
      `INSERT OR IGNORE INTO user_alias_permissions (user_id, alias_id)
       VALUES (?, ?)`,
      [user_id, aliasId]
    )

    await logAction('ALIAS_GRANT', req.user!.id, `Alias ${aliasId} to user ${user_id}`, getIpAddress(req))

    res.json({ message: 'Permission granted' })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Revoke alias permission
router.post('/:aliasId/revoke', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body
    const aliasId = parseInt(req.params.aliasId)

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' })
    }

    // Check ownership/admin
    const alias = await getAsync<any>(
      `SELECT * FROM message_aliases WHERE id = ?`,
      [aliasId]
    )

    if (!alias) {
      return res.status(404).json({ error: 'Alias not found' })
    }

    const user = await getAsync<any>(
      `SELECT role FROM users WHERE id = ?`,
      [req.user!.id]
    )

    if (alias.owner_id !== req.user!.id && user?.role !== 'admin') {
      return res.status(403).json({ error: 'Permission denied' })
    }

    await runAsync(
      `DELETE FROM user_alias_permissions WHERE user_id = ? AND alias_id = ?`,
      [user_id, aliasId]
    )

    await logAction('ALIAS_REVOKE', req.user!.id, `Alias ${aliasId} from user ${user_id}`, getIpAddress(req))

    res.json({ message: 'Permission revoked' })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Disable alias (admin only)
router.patch('/:aliasId/disable', async (req: Request, res: Response) => {
  try {
    const aliasId = parseInt(req.params.aliasId)

    const user = await getAsync<any>(
      `SELECT role FROM users WHERE id = ?`,
      [req.user!.id]
    )

    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can disable aliases' })
    }

    await runAsync(
      `UPDATE message_aliases SET enabled = 0 WHERE id = ?`,
      [aliasId]
    )

    await logAction('ALIAS_DISABLE', req.user!.id, `Alias: ${aliasId}`, getIpAddress(req))

    res.json({ message: 'Alias disabled' })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
