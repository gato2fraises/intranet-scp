import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { generateToken, getIpAddress } from '../auth'
import { getUserByUsername, logAction } from '../utils'

const router = Router()

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' })
    }

    const user = await getUserByUsername(username)
    if (!user) {
      await logAction('LOGIN_FAILED', null, `Username not found: ${username}`, getIpAddress(req))
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    if (user.suspended) {
      await logAction('LOGIN_FAILED', user.id, 'Account suspended', getIpAddress(req))
      return res.status(403).json({ error: 'Account suspended' })
    }

    const validPassword = await bcrypt.compare(password, user.password || '')
    if (!validPassword) {
      await logAction('LOGIN_FAILED', user.id, 'Invalid password', getIpAddress(req))
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
      clearance: user.clearance,
    })

    await logAction('LOGIN_SUCCESS', user.id, null, getIpAddress(req))

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        clearance: user.clearance,
        department: user.department,
        suspended: user.suspended,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
