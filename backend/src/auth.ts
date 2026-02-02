import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'
import { JWTPayload } from './types.ts'

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload
      ip_address?: string
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key'

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  req.user = decoded
  req.ip_address = req.ip || req.socket.remoteAddress || 'unknown'
  next()
}

export function getIpAddress(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown'
}
