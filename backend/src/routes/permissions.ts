import { Router, Request, Response } from 'express'
import { authMiddleware, getIpAddress } from '../auth'
import { queryAsync, getAsync, runAsync, logAction } from '../utils'

const router = Router()

router.use(authMiddleware)

// Get all role permissions
router.get('/roles', async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' })
    }

    const permissions = await queryAsync<any>(
      'SELECT DISTINCT role FROM role_permissions ORDER BY role ASC',
      []
    )

    const result: any = {}
    for (const p of permissions) {
      const rolePerms = await queryAsync<any>(
        'SELECT permission FROM role_permissions WHERE role = ?',
        [(p as any).role]
      )
      result[(p as any).role] = rolePerms.map((r: any) => r.permission)
    }

    res.json(result)
  } catch (error) {
    console.error('Error fetching permissions:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Grant permission to role
router.post('/roles/:role/grant/:permission', async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' })
    }

    await runAsync(
      'INSERT OR IGNORE INTO role_permissions (role, permission) VALUES (?, ?)',
      [req.params.role, req.params.permission]
    )

    await logAction(
      'PERMISSION_GRANT',
      req.user!.id,
      `Role: ${req.params.role}, Permission: ${req.params.permission}`,
      getIpAddress(req)
    )

    res.json({ message: 'Permission granted' })
  } catch (error) {
    console.error('Error granting permission:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Revoke permission from role
router.delete('/roles/:role/revoke/:permission', async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' })
    }

    await runAsync(
      'DELETE FROM role_permissions WHERE role = ? AND permission = ?',
      [req.params.role, req.params.permission]
    )

    await logAction(
      'PERMISSION_REVOKE',
      req.user!.id,
      `Role: ${req.params.role}, Permission: ${req.params.permission}`,
      getIpAddress(req)
    )

    res.json({ message: 'Permission revoked' })
  } catch (error) {
    console.error('Error revoking permission:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get user permissions (individual + role-based)
router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await getAsync('SELECT role FROM users WHERE id = ?', [req.params.id]) as any
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Get role permissions
    const rolePerms = await queryAsync<any>(
      'SELECT permission FROM role_permissions WHERE role = ?',
      [user.role]
    )

    // Get individual permissions (not expired)
    const userPerms = await queryAsync<any>(
      'SELECT permission, valid_until FROM user_permissions WHERE user_id = ? AND (valid_until IS NULL OR valid_until > CURRENT_TIMESTAMP)',
      [req.params.id]
    )

    res.json({
      role_permissions: rolePerms.map((p: any) => p.permission),
      user_permissions: userPerms.map((p: any) => ({ permission: p.permission, valid_until: p.valid_until }))
    })
  } catch (error) {
    console.error('Error fetching user permissions:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Grant individual permission to user
router.post('/users/:id/grant/:permission', async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' })
    }

    const { valid_until } = req.body

    await runAsync(
      'INSERT OR REPLACE INTO user_permissions (user_id, permission, valid_until) VALUES (?, ?, ?)',
      [req.params.id, req.params.permission, valid_until || null]
    )

    await logAction(
      'USER_PERMISSION_GRANT',
      req.user!.id,
      `User: ${req.params.id}, Permission: ${req.params.permission}, Until: ${valid_until || 'permanent'}`,
      getIpAddress(req)
    )

    res.json({ message: 'Permission granted to user' })
  } catch (error) {
    console.error('Error granting user permission:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Revoke individual permission from user
router.delete('/users/:id/revoke/:permission', async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' })
    }

    await runAsync(
      'DELETE FROM user_permissions WHERE user_id = ? AND permission = ?',
      [req.params.id, req.params.permission]
    )

    await logAction(
      'USER_PERMISSION_REVOKE',
      req.user!.id,
      `User: ${req.params.id}, Permission: ${req.params.permission}`,
      getIpAddress(req)
    )

    res.json({ message: 'Permission revoked from user' })
  } catch (error) {
    console.error('Error revoking user permission:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
