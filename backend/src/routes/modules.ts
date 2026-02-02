import { Router, Request, Response } from 'express'
import { authMiddleware, getIpAddress } from '../auth'
import { queryAsync, getAsync, runAsync, logAction } from '../utils'

const router = Router()

router.use(authMiddleware)

// Get all modules
router.get('/', async (req: Request, res: Response) => {
  try {
    const modules = await queryAsync<any>(
      'SELECT * FROM modules ORDER BY name ASC',
      []
    )
    res.json(modules || [])
  } catch (error) {
    console.error('Error fetching modules:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Toggle module status (Admin only)
router.patch('/:name', async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' })
    }

    const { enabled } = req.body
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be boolean' })
    }

    const module = await getAsync('SELECT * FROM modules WHERE name = ?', [req.params.name])
    if (!module) {
      return res.status(404).json({ error: 'Module not found' })
    }

    await runAsync(
      'UPDATE modules SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?',
      [enabled ? 1 : 0, req.params.name]
    )

    await logAction(
      'MODULE_UPDATE',
      req.user!.id,
      `Module: ${req.params.name}, Status: ${enabled ? 'enabled' : 'disabled'}`,
      getIpAddress(req)
    )

    const updated = await getAsync('SELECT * FROM modules WHERE name = ?', [req.params.name])
    res.json(updated)
  } catch (error) {
    console.error('Error updating module:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update module config (Admin only)
router.put('/:name', async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' })
    }

    const { config } = req.body
    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: 'config must be an object' })
    }

    const module = await getAsync('SELECT * FROM modules WHERE name = ?', [req.params.name])
    if (!module) {
      return res.status(404).json({ error: 'Module not found' })
    }

    const configJson = JSON.stringify(config)
    await runAsync(
      'UPDATE modules SET config = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?',
      [configJson, req.params.name]
    )

    await logAction(
      'MODULE_CONFIG_UPDATE',
      req.user!.id,
      `Module: ${req.params.name}`,
      getIpAddress(req)
    )

    const updated = await getAsync('SELECT * FROM modules WHERE name = ?', [req.params.name])
    res.json(updated)
  } catch (error) {
    console.error('Error updating module config:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
