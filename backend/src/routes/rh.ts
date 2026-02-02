import { Router, Request, Response } from 'express'
import { authMiddleware, getIpAddress } from '../auth'
import { queryAsync, getAsync, runAsync, logAction } from '../utils'
import { generateTemporaryPassword, sendDiscordNotification, createUserCreationEmbed } from '../discord'

interface UserRow {
  id?: number
  username?: string
  role?: string
  clearance?: number
  department?: string
  suspended?: number
}

const router = Router()

router.use(authMiddleware)

// Get all users (RH/Direction/Staff only)
router.get('/users', async (req: Request, res: Response) => {
  try {
    if (!['administration', 'direction', 'staff', 'admin'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const users = await queryAsync<any>(
      `SELECT id, username, role, clearance, department, suspended, created_at FROM users
       ORDER BY username ASC`
    )

    res.json(users)
    await logAction('RH_VIEW_USERS', req.user!.id, null, getIpAddress(req))
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get user fiche
router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    if (!['administration', 'direction', 'staff', 'admin'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const user = await getAsync<any>(
      `SELECT id, username, role, clearance, department, suspended, created_at FROM users WHERE id = ?`,
      [req.params.id]
    )

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const notes = await queryAsync<any>(
      `SELECT rn.*, u.username as author_name FROM rh_notes rn
       JOIN users u ON rn.author_id = u.id
       WHERE rn.user_id = ?
       ORDER BY rn.created_at DESC`,
      [req.params.id]
    )

    res.json({ ...user, notes })
    await logAction('RH_VIEW_FICHE', req.user!.id, `User: ${user.username}`, getIpAddress(req))
  } catch (error) {
    console.error('Error fetching user fiche:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update user clearance
router.patch('/clearance/:id', async (req: Request, res: Response) => {
  try {
    if (!['administration', 'direction', 'staff', 'admin'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const { clearance } = req.body

    if (typeof clearance !== 'number' || clearance < 0 || clearance > 6) {
      return res.status(400).json({ error: 'Invalid clearance level' })
    }

    await runAsync(
      'UPDATE users SET clearance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [clearance, req.params.id]
    )

    await logAction('RH_CHANGE_CLEARANCE', req.user!.id, `User: ${req.params.id}, New: ${clearance}`, getIpAddress(req))

    res.json({ message: 'Clearance updated' })
  } catch (error) {
    console.error('Error updating clearance:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Add RH note
router.post('/notes/:id', async (req: Request, res: Response) => {
  try {
    if (!['administration', 'direction', 'staff', 'admin'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const { content } = req.body

    if (!content) {
      return res.status(400).json({ error: 'Note is required' })
    }

    const noteId = await runAsync(
      `INSERT INTO rh_notes (user_id, author_id, note) VALUES (?, ?, ?)`,
      [req.params.id, req.user!.id, content]
    )

    await logAction('RH_ADD_NOTE', req.user!.id, `User: ${req.params.id}`, getIpAddress(req))

    res.status(201).json({ id: noteId, message: 'Note added' })
  } catch (error) {
    console.error('Error adding note:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get notes for user
router.get('/notes/:id', async (req: Request, res: Response) => {
  try {
    if (!['administration', 'direction', 'staff', 'admin'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const notes = await queryAsync<any>(
      `SELECT rn.*, u.username as author_name FROM rh_notes rn
       JOIN users u ON rn.author_id = u.id
       WHERE rn.user_id = ?
       ORDER BY rn.created_at DESC`,
      [req.params.id]
    )

    res.json(notes)
  } catch (error) {
    console.error('Error fetching notes:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Suspend user
router.patch('/suspend/:id', async (req: Request, res: Response) => {
  try {
    if (!['administration', 'direction', 'staff', 'admin'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const { suspended } = req.body

    await runAsync(
      'UPDATE users SET suspended = ? WHERE id = ?',
      [suspended ? 1 : 0, req.params.id]
    )

    await logAction(suspended ? 'RH_SUSPEND' : 'RH_UNSUSPEND', req.user!.id, `User: ${req.params.id}`, getIpAddress(req))

    res.json({ message: 'User status updated' })
  } catch (error) {
    console.error('Error updating user status:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create new user
router.post('/users', async (req: Request, res: Response) => {
  try {
    if (!['administration', 'direction', 'admin'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const { username, role, clearance, department } = req.body

    if (!username || !role || clearance === undefined || !department) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Check if username already exists
    const existing = await getAsync('SELECT id FROM users WHERE username = ?', [username])
    if (existing) {
      return res.status(409).json({ error: 'Username already exists' })
    }

    // Generate temporary password
    const temporaryPassword = generateTemporaryPassword()

    // Hash password
    const bcrypt = await import('bcryptjs')
    const hashedPassword = await bcrypt.default.hash(temporaryPassword, 10)

    // Create user
    const result = await runAsync(
      `INSERT INTO users (username, password, role, clearance, department, suspended, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`,
      [username, hashedPassword, role, clearance, department]
    )

    await logAction('RH_CREATE_USER', req.user!.id, `User: ${username}`, getIpAddress(req))

    // Send Discord notification
    const embed = createUserCreationEmbed(username, temporaryPassword, role, department)
    await sendDiscordNotification(embed)

    res.status(201).json({ 
      id: result,
      username,
      role,
      clearance,
      department,
      suspended: false,
      temporaryPassword: temporaryPassword
    })
  } catch (error) {
    console.error('Error creating user:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete user (Admin only)
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' })
    }

    const user = await getAsync('SELECT username, role, department FROM users WHERE id = ?', [req.params.id]) as UserRow | undefined
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Delete user and cascade delete associated data
    await runAsync('DELETE FROM users WHERE id = ?', [req.params.id])

    await logAction('RH_DELETE_USER', req.user!.id, `User: ${user.username}`, getIpAddress(req))

    // Send Discord notification
    const deleteEmbed = {
      title: '🗑️ Utilisateur supprimé',
      description: `Le profil utilisateur a été supprimé du système`,
      fields: [
        {
          name: 'Identifiant supprimé',
          value: `\`${user.username}\``,
          inline: true
        },
        {
          name: 'Ancien rôle',
          value: `\`${user.role}\``,
          inline: true
        },
        {
          name: 'Département',
          value: `\`${user.department}\``,
          inline: true
        },
        {
          name: 'Supprimé par',
          value: `\`${req.user!.username}\``,
          inline: true
        }
      ],
      color: 13632027, // Red color
      timestamp: new Date().toISOString(),
      footer: { text: 'Fondation SCP Intranet' }
    }
    await sendDiscordNotification(deleteEmbed)

    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update user role
router.patch('/role/:id', async (req: Request, res: Response) => {
  try {
    // Only admin or staff can change roles, but with different restrictions
    const isAdmin = req.user!.role === 'admin'
    const isStaff = req.user!.role === 'staff'

    if (!isAdmin && !isStaff) {
      return res.status(403).json({ error: 'Admin or Staff only' })
    }

    const { role } = req.body
    if (!role) {
      return res.status(400).json({ error: 'Role is required' })
    }

    const user = await getAsync('SELECT username, role FROM users WHERE id = ?', [req.params.id]) as UserRow | undefined
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Staff cannot modify Admin users
    if (isStaff && (user.role === 'admin' || role === 'admin')) {
      return res.status(403).json({ error: 'Staff cannot modify admin users' })
    }

    await runAsync(
      'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [role, req.params.id]
    )

    await logAction(
      'RH_CHANGE_ROLE',
      req.user!.id,
      `User: ${user.username}, From: ${user.role}, To: ${role}`,
      getIpAddress(req)
    )

    res.json({ message: 'Role updated successfully' })
  } catch (error) {
    console.error('Error updating role:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Reset password (Admin only)
router.post('/reset-password/:id', async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' })
    }

    const user = await getAsync('SELECT username FROM users WHERE id = ?', [req.params.id]) as UserRow | undefined
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const tempPassword = generateTemporaryPassword()
    const hashedPassword = require('bcryptjs').hashSync(tempPassword, 10)

    await runAsync(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, req.params.id]
    )

    await logAction('RH_RESET_PASSWORD', req.user!.id, `User: ${user.username}`, getIpAddress(req))

    // Send Discord notification
    const resetEmbed = {
      title: '🔐 Réinitialisation de mot de passe',
      description: `Un administrateur a réinitialisé le mot de passe de l'utilisateur **${user.username}**`,
      fields: [
        {
          name: 'Nouvel identifiant',
          value: `\`${user.username}\``,
          inline: true
        },
        {
          name: 'Mot de passe temporaire',
          value: `\`\`\`${tempPassword}\`\`\``,
          inline: true
        }
      ],
      color: 3447003,
      timestamp: new Date().toISOString(),
      footer: { text: 'Fondation SCP Intranet' }
    }
    await sendDiscordNotification(resetEmbed)

    res.json({ 
      message: 'Password reset successfully',
      temporaryPassword: tempPassword
    })
  } catch (error) {
    console.error('Error resetting password:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
