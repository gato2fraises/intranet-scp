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
  archived: boolean
  created_at: string
  sender?: { username: string }
}

interface User {
  id: number
  username: string
  department: string
}

const Mail: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedMsg, setSelectedMsg] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCompose, setShowCompose] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [sendingMessage, setSendingMessage] = useState(false)
  const [composeForm, setComposeForm] = useState({
    recipient_id: '',
    subject: '',
    body: ''
  })
  const [successMessage, setSuccessMessage] = useState('')
  useAuth()

  useEffect(() => {
    fetchMessages()
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/annuaire`, {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (err) {
      console.error('Erreur lors du chargement des utilisateurs')
    }
  }

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/messages/inbox`, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error('Erreur lors du chargement des messages')
      const data = await response.json()
      setMessages(data.messages || [])
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (msgId: number) => {
    try {
      await fetch(`${API_BASE_URL}/messages/${msgId}/read`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      })
      setMessages(messages.map(m => m.id === msgId ? { ...m, is_read: true } : m))
    } catch {
      console.error('Erreur lors du marquage comme lu')
    }
  }

  const selectedMessage = messages.find(m => m.id === selectedMsg)
  const unreadCount = messages.filter(m => !m.is_read).length

  const sendMessage = async () => {
    if (!composeForm.recipient_id || !composeForm.subject.trim() || !composeForm.body.trim()) {
      setError('Veuillez remplir tous les champs')
      return
    }

    try {
      setSendingMessage(true)
      setError('')
      const response = await fetch(`${API_BASE_URL}/messages/send`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient_id: parseInt(composeForm.recipient_id),
          subject: composeForm.subject.trim(),
          body: composeForm.body.trim()
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de l\'envoi')
      }

      setSuccessMessage('Message envoyé avec succès !')
      setComposeForm({ recipient_id: '', subject: '', body: '' })
      setTimeout(() => {
        setShowCompose(false)
        setSuccessMessage('')
        fetchMessages()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi')
    } finally {
      setSendingMessage(false)
    }
  }

  if (showCompose) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <button
          onClick={() => {
            setShowCompose(false)
            setError('')
            setSuccessMessage('')
            setComposeForm({ recipient_id: '', subject: '', body: '' })
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '13px',
            cursor: 'pointer',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ← Retour
        </button>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '24px' }}>
          Nouveau message
        </h2>

        {/* Success Message */}
        {successMessage && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '10px',
            fontSize: '13px',
            color: '#34d399',
            marginBottom: '16px'
          }}>
            ✓ {successMessage}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '10px',
            fontSize: '13px',
            color: '#f87171',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Recipient */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
              Destinataire
            </label>
            <select
              value={composeForm.recipient_id}
              onChange={(e) => setComposeForm({ ...composeForm, recipient_id: e.target.value })}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#fff',
                cursor: 'pointer',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Sélectionner un destinataire...</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.username} {user.department ? `(${user.department})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
              Objet
            </label>
            <input
              type="text"
              value={composeForm.subject}
              onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
              placeholder="Objet du message..."
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#fff',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Body */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
              Message
            </label>
            <textarea
              value={composeForm.body}
              onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })}
              placeholder="Votre message..."
              rows={8}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#fff',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Send Button */}
          <button
            onClick={sendMessage}
            disabled={sendingMessage}
            style={{
              padding: '14px 24px',
              background: sendingMessage ? 'rgba(59, 130, 246, 0.5)' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#fff',
              cursor: sendingMessage ? 'not-allowed' : 'pointer',
              marginTop: '8px'
            }}
          >
            {sendingMessage ? 'Envoi en cours...' : 'Envoyer le message'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
          {messages.length} messages • {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setShowCompose(true)}
          style={{
            padding: '10px 16px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#fff',
            cursor: 'pointer'
          }}
        >
          + Nouveau message
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '10px',
          fontSize: '13px',
          color: '#f87171'
        }}>
          {error}
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* Messages List */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                Chargement...
              </div>
            ) : messages.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                Aucun message
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => {
                    setSelectedMsg(msg.id)
                    if (!msg.is_read) markAsRead(msg.id)
                  }}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    cursor: 'pointer',
                    background: selectedMsg === msg.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedMsg !== msg.id) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                  }}
                  onMouseLeave={(e) => {
                    if (selectedMsg !== msg.id) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#fff',
                      flexShrink: 0
                    }}>
                      {(msg.sender?.username || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: msg.is_read ? 400 : 600,
                          color: '#fff'
                        }}>
                          {msg.sender?.username || `Utilisateur #${msg.sender_id}`}
                        </span>
                        {!msg.is_read && (
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#3b82f6'
                          }} />
                        )}
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: msg.is_read ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.8)',
                        fontWeight: msg.is_read ? 400 : 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {msg.subject}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.3)',
                        marginTop: '6px'
                      }}>
                        {new Date(msg.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Message Details */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          {selectedMessage ? (
            <>
              {/* Message Header */}
              <div style={{
                padding: '24px',
                borderBottom: '1px solid rgba(255,255,255,0.06)'
              }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#fff'
                  }}>
                    {(selectedMessage.sender?.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#fff',
                      margin: 0
                    }}>
                      {selectedMessage.sender?.username || `Utilisateur #${selectedMessage.sender_id}`}
                    </h3>
                    <p style={{
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.4)',
                      margin: '4px 0 0'
                    }}>
                      {new Date(selectedMessage.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
                <h2 style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#fff',
                  margin: '20px 0 0'
                }}>
                  {selectedMessage.subject}
                </h2>
              </div>

              {/* Message Content */}
              <div style={{ padding: '24px' }}>
                <div style={{
                  padding: '20px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.8)',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  maxHeight: '350px',
                  overflowY: 'auto'
                }}>
                  {selectedMessage.body}
                </div>
              </div>
            </>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '400px',
              color: 'rgba(255,255,255,0.3)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>◈</div>
              <p style={{ fontSize: '14px' }}>Sélectionnez un message</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Mail
