import db from './database.ts'
import { User } from './types.ts'

export function queryAsync<T>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err)
      else resolve((rows as T[]) || [])
    })
  })
}

export function getAsync<T>(sql: string, params: any[] = []): Promise<T | null> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err)
      else resolve((row as T) || null)
    })
  })
}

export function runAsync(sql: string, params: any[] = []): Promise<number> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err)
      else resolve(this.lastID)
    })
  })
}

export async function getUserById(id: number): Promise<User | null> {
  const user = await getAsync<any>(
    'SELECT * FROM users WHERE id = ?',
    [id]
  )
  return user ? formatUser(user) : null
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const user = await getAsync<any>(
    'SELECT * FROM users WHERE username = ?',
    [username]
  )
  return user ? formatUser(user) : null
}

function formatUser(user: any): User {
  return {
    ...user,
    suspended: Boolean(user.suspended),
  }
}

export async function logAction(
  action: string,
  userId: number | null,
  details: string | null,
  ipAddress: string
): Promise<void> {
  await runAsync(
    'INSERT INTO logs (action, user_id, details, ip_address) VALUES (?, ?, ?, ?)',
    [action, userId, details, ipAddress]
  )
}
