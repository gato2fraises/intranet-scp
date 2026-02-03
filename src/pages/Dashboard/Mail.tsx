import React, { useState, useEffect } from 'react'
import { useAuth, getAuthHeaders } from '../../contexts/AuthContext'
import { API_BASE_URL } from '../../config'

interface Message {
  id: number
  sender_id: number
  recipient_id: number
  subject: string
  body: string
  is_read: boolean
  is_draft: boolean
  archived: boolean
  deleted: boolean
  priority: string
  folder: string
  sender_alias?: string
  thread_id?: number
  created_at: string
  updated_at: string
  sender?: { username: string }
  attachments?: Array<{ id: number; title: string }>
}

interface User {
  id: number
  username: string
  department: string
}

interface FolderCounts {
  inbox: number
  sent: number
  drafts: number
  archived: number
  trash: number
}

const Mail: React.FC = () => {
  // Messages state
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedMsg, setSelectedMsg] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  
  // Folder & navigation
  const [currentFolder, setCurrentFolder] = useState<string>('inbox')
  const [folderCounts, setFolderCounts] = useState<FolderCounts>({
    inbox: 0, sent: 0, drafts: 0, archived: 0, trash: 0
  })
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [aliases, setAliases] = useState<any[]>([])
  
  // Compose mode
  const [showCompose, setShowCompose] = useState(false)
  const [composingMessageId, setComposingMessageId] = useState<number | null>(null)
  const [composeForm, setComposeForm] = useState({
    recipient_id: '',
    subject: '',
    body: '',
    priority: 'information'
  })
  
  // UI state
  const [users, setUsers] = useState<User[]>([])
  const [sendingMessage, setSendingMessage] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchMessages()
      fetchUsers()
      fetchFolderCounts()
      fetchAliases()
    }
  }, [user, currentFolder, page])

  const fetchFolderCounts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/folders`, {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setFolderCounts(data)
      }
    } catch (err) {
      console.error('Error fetching folder counts:', err)
    }
  }

  const fetchAliases = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/message-aliases`, {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setAliases(data)
      }
    } catch (err) {
      console.error('Error fetching aliases:', err)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/annuaire`, {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
        console.log('✓ Users loaded:', data)
      } else {
        console.warn('Annuaire endpoint returned:', response.status)
        // Fallback: create a test user
        setUsers([
          { id: 2, username: 'administrateur', department: 'Administration' },
          { id: 1, username: 'test', department: 'Recherche' }
        ])
      }
    } catch (err) {
      console.error('Error fetching users:', err)
      // Fallback: create a test user
      setUsers([
        { id: 2, username: 'administrateur', department: 'Administration' },
        { id: 1, username: 'test', department: 'Recherche' }
      ])
    }
  }

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `${API_BASE_URL}/messages/inbox?folder=${currentFolder}&page=${page}`,
        { headers: getAuthHeaders() }
      )
      if (!response.ok) throw new Error('Erreur lors du chargement des messages')
      const data = await response.json()
      
      // Handle new pagination format
      if (data.messages) {
        setMessages(data.messages)
        setTotalPages(data.pages || 1)
      } else {
        setMessages(data)
      }
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const searchMessages = async () => {
    if (!searchQuery.trim()) return
    
    try {
      setLoading(true)
      const response = await fetch(
        `${API_BASE_URL}/messages/search/query?q=${encodeURIComponent(searchQuery)}&folder=${currentFolder}`,
        { headers: getAuthHeaders() }
      )
      if (response.ok) {
        const data = await response.json()
        setMessages(data)
      }
    } catch (err) {
      console.error('Error searching:', err)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (msgId: number, isRead: boolean) => {
    try {
      const endpoint = isRead ? 'unread' : 'read'
      await fetch(`${API_BASE_URL}/messages/${msgId}/${endpoint}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      })
      setMessages(messages.map(m => m.id === msgId ? { ...m, is_read: !isRead } : m))
      setSelectedMsg(null)
      fetchFolderCounts()
    } catch (err) {
      console.error('Error toggling read status:', err)
    }
  }

  const moveToFolder = async (msgId: number, folder: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/${msgId}/folder`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder })
      })
      if (response.ok) {
        setMessages(messages.filter(m => m.id !== msgId))
        setSelectedMsg(null)
        fetchFolderCounts()
      }
    } catch (err) {
      console.error('Error moving message:', err)
    }
  }

  const deleteMessage = async (msgId: number) => {
    if (confirm('Supprimer ce message ?')) {
      try {
        await fetch(`${API_BASE_URL}/messages/${msgId}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        })
        setMessages(messages.filter(m => m.id !== msgId))
        setSelectedMsg(null)
        fetchFolderCounts()
      } catch (err) {
        console.error('Error deleting message:', err)
      }
    }
  }

  const saveOrSendMessage = async () => {
    console.log('saveOrSendMessage called with:', composeForm)
    
    if (!composeForm.recipient_id) {
      setError('❌ Veuillez sélectionner un destinataire')
      console.error('No recipient_id:', composeForm.recipient_id)
      return
    }
    
    if (!composeForm.subject.trim()) {
      setError('❌ Veuillez entrer un objet')
      return
    }
    
    if (!composeForm.body.trim()) {
      setError('❌ Veuillez entrer un message')
      return
    }

    try {
      setSendingMessage(true)
      setError('')

      // If it's a draft update, save draft
      // Otherwise, send the message
      const endpoint = composingMessageId ? 'draft' : 'send'
      const payload = {
        id: composingMessageId,
        ...composeForm,
        recipient_id: parseInt(composeForm.recipient_id)
      }
      
      console.log('Sending to:', `${API_BASE_URL}/messages/${endpoint}`)
      console.log('Payload:', payload)
      
      const response = await fetch(`${API_BASE_URL}/messages/${endpoint}`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const data = await response.json()
        console.error('Server error:', data)
        throw new Error(data.error || 'Erreur lors de l\'envoi')
      }

      const result = await response.json()
      console.log('✓ Message sent successfully:', result)
      
      setSuccessMessage(composingMessageId ? 'Brouillon enregistré' : 'Message envoyé avec succès !')
      resetCompose()
      setTimeout(() => {
        setSuccessMessage('')
        fetchMessages()
        fetchFolderCounts()
      }, 1500)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue'
      console.error('❌ Error:', errorMsg)
      setError(errorMsg)
    } finally {
      setSendingMessage(false)
    }
  }

  const resetCompose = () => {
    setShowCompose(false)
    setComposingMessageId(null)
    setComposeForm({
      recipient_id: '',
      subject: '',
      body: '',
      priority: 'information'
    })
  }

  const handleReply = async (messageId: number) => {
    try {
      setSendingMessage(true)
      setError('')

      // Get original message to get sender info
      const original = messages.find(m => m.id === messageId)
      if (!original) {
        setError('Message original introuvable')
        return
      }

      // Pre-fill reply form with original sender as recipient
      setComposeForm({
        recipient_id: original.sender_id.toString(),
        subject: original.subject.startsWith('RE:') ? original.subject : `RE: ${original.subject}`,
        body: `\n\n--- Message original ---\nDe: ${original.sender?.username || 'Inconnu'}\n${original.body}`,
        priority: 'information'
      })

      setSelectedMsg(null)
      setShowCompose(true)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue'
      console.error('❌ Error preparing reply:', errorMsg)
      setError(errorMsg)
    } finally {
      setSendingMessage(false)
    }
  }

  const editDraft = (draft: Message) => {
    setComposingMessageId(draft.id)
    setComposeForm({
      recipient_id: draft.recipient_id.toString(),
      subject: draft.subject,
      body: draft.body,
      priority: draft.priority
    })
    setShowCompose(true)
    setSelectedMsg(null)
  }

  const selectedMessage = messages.find(m => m.id === selectedMsg)

  // UI: Compose Mode
  // Show compose form as modal overlay
  const composeModal = showCompose && (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '24px', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <button onClick={resetCompose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', marginBottom: '16px' }}>
          ← Retour
        </button>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '24px' }}>
          {composingMessageId ? 'Éditer brouillon' : 'Nouveau message'}
        </h2>

        {successMessage && (
          <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '10px', color: '#34d399', marginBottom: '16px' }}>
            ✓ {successMessage}
          </div>
        )}

        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', color: '#f87171', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Destinataire</label>
            <select value={composeForm.recipient_id} onChange={(e) => setComposeForm({...composeForm, recipient_id: e.target.value})} style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '14px', color: '#fff', cursor: 'pointer' }}>
              <option value="">Sélectionner...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Priorité</label>
            <select value={composeForm.priority} onChange={(e) => setComposeForm({...composeForm, priority: e.target.value})} style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '14px', color: '#fff' }}>
              <option value="information">Information</option>
              <option value="alerte">Alerte</option>
              <option value="critique">Critique</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Objet</label>
            <input type="text" value={composeForm.subject} onChange={(e) => setComposeForm({...composeForm, subject: e.target.value})} placeholder="Objet du message..." style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '14px', color: '#fff' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Message</label>
            <textarea value={composeForm.body} onChange={(e) => setComposeForm({...composeForm, body: e.target.value})} placeholder="Votre message..." rows={10} style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '14px', color: '#fff', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => { saveOrSendMessage() }} disabled={sendingMessage} style={{ flex: 1, padding: '14px 24px', background: sendingMessage ? 'rgba(59, 130, 246, 0.5)' : '#3b82f6', border: 'none', borderRadius: '8px', color: '#fff', cursor: sendingMessage ? 'not-allowed' : 'pointer' }}>
              {sendingMessage ? '...' : (composingMessageId ? 'Enregistrer' : 'Envoyer')}
            </button>
            {composingMessageId && (
              <button onClick={() => deleteMessage(composingMessageId)} style={{ padding: '14px 24px', background: '#ef4444', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>
                Supprimer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  // UI: Main Mail View
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#fff', margin: '0 0 8px 0' }}>Messagerie</h2>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            {messages.length} message{messages.length > 1 ? 's' : ''} • {folderCounts.inbox} non lu{folderCounts.inbox > 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowCompose(true)} style={{ padding: '10px 16px', background: '#3b82f6', border: 'none', borderRadius: '8px', fontSize: '13px', color: '#fff', cursor: 'pointer' }}>
          + Nouveau
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Rechercher..." onKeyPress={(e) => e.key === 'Enter' && searchMessages()} style={{ flex: 1, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '13px', color: '#fff' }} />
        <button onClick={searchMessages} style={{ padding: '10px 16px', background: '#3b82f6', border: 'none', borderRadius: '8px', fontSize: '13px', color: '#fff', cursor: 'pointer' }}>
          🔍
        </button>
      </div>

      {error && <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', color: '#f87171' }}>{error}</div>}

      {/* Folders + Messages Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 2fr', gap: '24px' }}>
        {/* Folders Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {['inbox', 'sent', 'drafts', 'archived', 'trash'].map(folder => (
            <button key={folder} onClick={() => { setCurrentFolder(folder); setPage(0); setSelectedMsg(null) }} style={{ padding: '12px 16px', background: currentFolder === folder ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)', border: '1px solid ' + (currentFolder === folder ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.08)'), borderRadius: '8px', fontSize: '13px', color: currentFolder === folder ? '#3b82f6' : 'rgba(255,255,255,0.7)', cursor: 'pointer', textAlign: 'left', textTransform: 'capitalize' }}>
              {folder} {folderCounts[folder as keyof FolderCounts] > 0 && `(${folderCounts[folder as keyof FolderCounts]})`}
            </button>
          ))}
        </div>

        {/* Messages List */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Chargement...</div>
          ) : messages.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Aucun message</div>
          ) : (
            <div>
              {messages.map((msg) => (
                <button key={msg.id} onClick={() => setSelectedMsg(msg.id)} style={{ width: '100%', padding: '16px', background: selectedMsg === msg.id ? 'rgba(59, 130, 246, 0.1)' : msg.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.05)', border: selectedMsg === msg.id ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.06)', borderBottom: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: msg.is_read ? 400 : 600, color: '#fff', marginBottom: '4px' }}>
                      {msg.sender?.username || 'Système'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
                      {msg.subject}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                      {new Date(msg.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', padding: '4px 8px', background: msg.priority === 'critique' ? 'rgba(239, 68, 68, 0.2)' : msg.priority === 'alerte' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)', borderRadius: '4px', color: msg.priority === 'critique' ? '#f87171' : msg.priority === 'alerte' ? '#fbbf24' : '#60a5fa' }}>
                      {msg.priority}
                    </span>
                    {!msg.is_read && <span style={{ width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%' }} />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message Details */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {selectedMessage ? (
            <>
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: '0 0 8px 0' }}>DE</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>{selectedMessage.sender?.username}</p>
              </div>

              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: '0 0 8px 0' }}>OBJET</p>
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#fff', margin: 0 }}>{selectedMessage.subject}</p>
              </div>

              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: '0 0 8px 0' }}>CONTENU</p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', margin: 0, whiteSpace: 'pre-wrap' }}>{selectedMessage.body}</p>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => handleReply(selectedMessage.id)} style={{ padding: '8px 12px', background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '6px', fontSize: '12px', color: '#86efac', cursor: 'pointer' }}>
                  Répondre
                </button>
                <button onClick={() => markAsRead(selectedMessage.id, selectedMessage.is_read)} style={{ padding: '8px 12px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', fontSize: '12px', color: '#60a5fa', cursor: 'pointer' }}>
                  {selectedMessage.is_read ? 'Marquer comme non lu' : 'Marquer comme lu'}
                </button>
                <button onClick={() => moveToFolder(selectedMessage.id, 'archived')} style={{ padding: '8px 12px', background: 'rgba(251, 191, 36, 0.2)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '6px', fontSize: '12px', color: '#fbbf24', cursor: 'pointer' }}>
                  Archiver
                </button>
                <button onClick={() => deleteMessage(selectedMessage.id)} style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', fontSize: '12px', color: '#f87171', cursor: 'pointer' }}>
                  Supprimer
                </button>
                {currentFolder === 'drafts' && (
                  <button onClick={() => editDraft(selectedMessage)} style={{ padding: '8px 12px', background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '6px', fontSize: '12px', color: '#86efac', cursor: 'pointer' }}>
                    Éditer
                  </button>
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              Sélectionner un message
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {composeModal}
    </div>
  )
}

export default Mail
