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
          author_id INTEGER NOT NULL,
          department TEXT NOT NULL,
          clearance INTEGER NOT NULL DEFAULT 0,
          status TEXT DEFAULT 'draft',
          is_deleted INTEGER DEFAULT 0,
          tags TEXT DEFAULT '[]',
          reference_id TEXT,
          version INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (author_id) REFERENCES users(id)
        )
      `)

      // Document Versions table (for versioning/history)
      db.run(`
        CREATE TABLE IF NOT EXISTS document_versions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          document_id INTEGER NOT NULL,
          version INTEGER NOT NULL,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          edited_by INTEGER NOT NULL,
          change_summary TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (document_id) REFERENCES documents(id),
          FOREIGN KEY (edited_by) REFERENCES users(id),
          UNIQUE(document_id, version)
        )
      `)

      // Document Permissions table (role-based, department-based, user whitelist/blacklist)
      db.run(`
        CREATE TABLE IF NOT EXISTS document_permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          document_id INTEGER NOT NULL,
          permission_type TEXT NOT NULL,
          target_id TEXT NOT NULL,
          is_allowed INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (document_id) REFERENCES documents(id)
        )
      `)

      // Document Audit Log
      db.run(`
        CREATE TABLE IF NOT EXISTS document_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          document_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          actor_id INTEGER NOT NULL,
          details TEXT,
          ip_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (document_id) REFERENCES documents(id),
          FOREIGN KEY (actor_id) REFERENCES users(id)
        )
      `)

      // Messages table (content only - no recipient or folder)
      db.run(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sender_id INTEGER NOT NULL,
          subject TEXT NOT NULL,
          body TEXT NOT NULL,
          priority TEXT DEFAULT 'information',
          sender_alias TEXT,
          thread_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sender_id) REFERENCES users(id)
        )
      `)

      // Mailboxes table (user-message associations with folder and read status)
      db.run(`
        CREATE TABLE IF NOT EXISTS mailboxes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          message_id INTEGER NOT NULL,
          folder TEXT NOT NULL,
          is_read INTEGER DEFAULT 0,
          archived INTEGER DEFAULT 0,
          deleted INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (message_id) REFERENCES messages(id),
          UNIQUE(user_id, message_id, folder)
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
      `)

      // Message Aliases table
      db.run(`
        CREATE TABLE IF NOT EXISTS message_aliases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          description TEXT,
          owner_id INTEGER NOT NULL,
          enabled INTEGER DEFAULT 1,
          admin_only INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (owner_id) REFERENCES users(id)
        )
      `)

      // User Alias Permissions table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_alias_permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          alias_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (alias_id) REFERENCES message_aliases(id),
          UNIQUE(user_id, alias_id)
        )
      `)

      // Message Attachments table
      db.run(`
        CREATE TABLE IF NOT EXISTS message_attachments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          message_id INTEGER NOT NULL,
          document_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (message_id) REFERENCES messages(id),
          FOREIGN KEY (document_id) REFERENCES documents(id)
        )
      `)

      // Anti-abuse restrictions
      db.run(`
        CREATE TABLE IF NOT EXISTS user_message_restrictions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          restriction_type TEXT NOT NULL,
          reason TEXT,
          blocked_until DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_by INTEGER,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `)

      // Announcements table
      db.run(`
        CREATE TABLE IF NOT EXISTS announcements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          priority TEXT DEFAULT 'medium',
          scope TEXT DEFAULT 'global',
          scope_value TEXT,
          created_by INTEGER NOT NULL,
          valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,
          valid_to DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id)
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
