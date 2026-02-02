import sqlite3 from 'sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '../data/intranet.db')

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Database connection error:', err)
  else console.log('✓ Connected to SQLite database')
})

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON')

export function initializeDatabase() {
  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL,
          clearance INTEGER NOT NULL,
          department TEXT NOT NULL,
          suspended INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Documents table
      db.run(`
        CREATE TABLE IF NOT EXISTS documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          type TEXT NOT NULL,
          clearance INTEGER NOT NULL,
          author_id INTEGER NOT NULL,
          archived INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (author_id) REFERENCES users(id)
        )
      `)

      // Messages table
      db.run(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sender_id INTEGER NOT NULL,
          recipient_id INTEGER NOT NULL,
          subject TEXT NOT NULL,
          body TEXT NOT NULL,
          is_read INTEGER DEFAULT 0,
          archived INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sender_id) REFERENCES users(id),
          FOREIGN KEY (recipient_id) REFERENCES users(id)
        )
      `)

      // RH Notes table
      db.run(`
        CREATE TABLE IF NOT EXISTS rh_notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          author_id INTEGER NOT NULL,
          note TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (author_id) REFERENCES users(id)
        )
      `)

      // Logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action TEXT NOT NULL,
          user_id INTEGER,
          details TEXT,
          ip_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `)

      // Modules table
      db.run(`
        CREATE TABLE IF NOT EXISTS modules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          description TEXT,
          enabled INTEGER DEFAULT 1,
          config TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Role Permissions table
      db.run(`
        CREATE TABLE IF NOT EXISTS role_permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          role TEXT NOT NULL,
          permission TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(role, permission)
        )
      `)

      // User Permissions table (individual overrides)
      db.run(`
        CREATE TABLE IF NOT EXISTS user_permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          permission TEXT NOT NULL,
          valid_until DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          UNIQUE(user_id, permission)
        )
      `, (err) => {
        if (err) reject(err)
        else {
          // Insert default modules
          db.run(`
            INSERT OR IGNORE INTO modules (name, description, enabled)
            VALUES 
              ('messagerie', 'Module de messagerie interne', 1),
              ('documents', 'Gestion des documents classifiés', 1),
              ('annuaire', 'Annuaire du personnel', 1),
              ('rh', 'Gestion des ressources humaines', 1)
          `, (err) => {
            if (err) reject(err)
            else {
              // Insert default role permissions
              db.run(`
                INSERT OR IGNORE INTO role_permissions (role, permission)
                VALUES 
                  ('admin', 'view_all_documents'),
                  ('admin', 'edit_documents'),
                  ('admin', 'archive_documents'),
                  ('admin', 'manage_users'),
                  ('admin', 'manage_roles'),
                  ('admin', 'view_logs'),
                  ('direction', 'view_all_documents'),
                  ('direction', 'edit_documents'),
                  ('staff', 'view_all_documents')
              `, (err) => {
                if (err) reject(err)
                else resolve()
              })
            }
          })
        }
      })
    })
  })
}

export default db
