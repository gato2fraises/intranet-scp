export interface User {
  id: number
  username: string
  password?: string
  role: 'scientifique' | 'securite' | 'administration' | 'direction' | 'ia' | 'staff'
  clearance: number
  department: string
  suspended: boolean
  created_at: string
  updated_at: string
}

export interface Document {
  id: number
  title: string
  body: string
  type: string
  clearance: number
  author_id: number
  archived: boolean
  created_at: string
  updated_at: string
}

export interface Message {
  id: number
  sender_id: number
  recipient_id: number
  subject: string
  body: string
  is_read: boolean
  archived: boolean
  created_at: string
}

export interface RHNote {
  id: number
  user_id: number
  author_id: number
  note: string
  created_at: string
}

export interface Log {
  id: number
  action: string
  user_id?: number
  details?: string
  ip_address?: string
  created_at: string
}

export interface JWTPayload {
  id: number
  username: string
  role: string
  clearance: number
}
