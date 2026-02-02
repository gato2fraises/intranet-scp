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
  type: 'rapport_incident' | 'rapport_scientifique' | 'procedure' | 'note_interne' | 'document_rh' | 'journal_garde' | 'compte_rendu_reunion' | 'avis_sanction' | 'directive_site'
  status: 'draft' | 'published' | 'archived' | 'in_validation' | 'refused'
  clearance: number
  author_id: number
  author_username?: string
  department: string
  is_deleted: boolean
  tags: string[]
  reference_id?: string
  version: number
  created_at: string
  updated_at: string
}

export interface DocumentVersion {
  id: number
  document_id: number
  version: number
  title: string
  body: string
  edited_by: number
  edited_by_username?: string
  change_summary?: string
  created_at: string
}

export interface DocumentPermission {
  id: number
  document_id: number
  permission_type: 'role' | 'department' | 'whitelist' | 'blacklist'
  target_id: string
  is_allowed: number
  created_at: string
}

export interface DocumentLog {
  id: number
  document_id: number
  action: 'created' | 'read' | 'edited' | 'published' | 'archived' | 'permission_changed' | 'deleted' | 'restored' | 'access_denied'
  actor_id: number
  actor_username?: string
  details?: string
  ip_address?: string
  created_at: string
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

export interface Announcement {
  id: number
  title: string
  content: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  scope: 'global' | 'department' | 'clearance'
  scope_value?: string
  valid_from: string
  valid_to: string
  created_at: string
}

export interface DashboardData {
  userInfo: {
    id: number
    username: string
    role: string
    department: string
    clearance: number
    status: 'active' | 'suspended'
    sessionStartTime: string
  }
  modulesStatus: {
    messagerie: 'actif' | 'maintenance' | 'desactive'
    documents: 'actif' | 'maintenance' | 'desactive'
    rh: 'actif' | 'maintenance' | 'desactive'
    supervision: 'actif' | 'maintenance' | 'desactive'
    annuaire: 'actif' | 'maintenance' | 'desactive'
  }
  messagingIndicators: {
    unread: number
    receivedPeriod: number
    sentPeriod: number
  }
  documentIndicators: {
    created: number
    recentlyViewed: number
    pendingValidation: number
  }
  recentActivity: {
    recentMessages: Array<{
      id: number
      subject: string
      sender_id: number
      sender_username: string
      created_at: string
    }>
    recentDocuments: Array<{
      id: number
      title: string
      type: string
      status: string
      author_id: number
      created_at: string
    }>
    systemNotifications: any[]
  }
  announcements: Announcement[]
  quickActions: Array<{
    id: string
    label: string
    icon: string
    action: string
  }>
}

