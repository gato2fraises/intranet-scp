import React, { useState, useEffect } from 'react'
import { useAuth, getAuthHeaders } from '../../contexts/AuthContext'
import { API_BASE_URL } from '../../config'

interface User {
  id: number
  username: string
  role: string
  clearance: number
  department: string
  suspended: boolean
}

interface RHNote {
  id: number
  user_id: number
  content: string
  created_at: string
}

// Styled input component
const Input: React.FC<{
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  type?: string
}> = ({ value, onChange, placeholder, type = 'text' }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    style={{
      width: '100%',
      padding: '10px 14px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '8px',
      fontSize: '13px',
      color: '#fff',
      outline: 'none',
      boxSizing: 'border-box',
      transition: 'border-color 0.15s ease'
    }}
    onFocus={(e) => e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)'}
    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
  />
)

// Styled select component
const Select: React.FC<{
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  children: React.ReactNode
}> = ({ value, onChange, children }) => (
  <select
    value={value}
    onChange={onChange}
    style={{
      width: '100%',
      padding: '10px 14px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '8px',
      fontSize: '13px',
      color: '#fff',
      outline: 'none',
      boxSizing: 'border-box',
      cursor: 'pointer'
    }}
  >
    {children}
  </select>
)

const RH: React.FC = () => {
  const { user } = useAuth()
  const [personnel, setPersonnel] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [notes, setNotes] = useState<RHNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [newNote, setNewNote] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const [newUser, setNewUser] = useState({
    username: '',
    role: '',
    clearance: 1,
    department: ''
  })

  useEffect(() => {
    fetchPersonnel()
  }, [])

  useEffect(() => {
    if (selectedUser) {
      fetchNotes(selectedUser.id)
    }
  }, [selectedUser])

  const fetchPersonnel = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/rh/users`, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error('Erreur lors du chargement du personnel')
      const data = await response.json()
      setPersonnel(data)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const fetchNotes = async (userId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/rh/notes/${userId}`, {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setNotes(data || [])
      }
    } catch (err) {
      console.error('Erreur:', err)
    }
  }

  const addNote = async () => {
    if (!selectedUser || !newNote.trim()) return
    try {
      const response = await fetch(`${API_BASE_URL}/rh/notes/${selectedUser.id}`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote })
      })
      if (response.ok) {
        setNewNote('')
        fetchNotes(selectedUser.id)
      }
    } catch (err) {
      console.error('Erreur:', err)
    }
  }

  const updateClearance = async (level: number) => {
    if (!selectedUser) return
    try {
      const response = await fetch(`${API_BASE_URL}/rh/clearance/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearance: level })
      })
      if (response.ok) {
        const updated = { ...selectedUser, clearance: level }
        setSelectedUser(updated)
        setPersonnel(personnel.map(u => u.id === selectedUser.id ? updated : u))
      }
    } catch (err) {
      console.error('Erreur:', err)
    }
  }

  const toggleSuspend = async () => {
    if (!selectedUser) return
    try {
      const response = await fetch(`${API_BASE_URL}/rh/suspend/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspended: !selectedUser.suspended })
      })
      if (response.ok) {
        const updated = { ...selectedUser, suspended: !selectedUser.suspended }
        setSelectedUser(updated)
        setPersonnel(personnel.map(u => u.id === selectedUser.id ? updated : u))
      }
    } catch (err) {
      console.error('Erreur:', err)
    }
  }

  const deleteUser = async () => {
    if (!selectedUser) return
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${selectedUser.username}" ? Cette action est irréversible.`)) {
      return
    }
    try {
      const response = await fetch(`${API_BASE_URL}/rh/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        setPersonnel(personnel.filter(u => u.id !== selectedUser.id))
        setSelectedUser(null)
      } else {
        alert('Erreur lors de la suppression')
      }
    } catch (err) {
      console.error('Erreur:', err)
      alert('Erreur lors de la suppression')
    }
  }

  const changeRole = async (newRole: string) => {
    if (!selectedUser) return
    try {
      const response = await fetch(`${API_BASE_URL}/rh/role/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })
      if (response.ok) {
        const updated = { ...selectedUser, role: newRole }
        setSelectedUser(updated)
        setPersonnel(personnel.map(u => u.id === selectedUser.id ? updated : u))
      } else {
        alert('Erreur lors du changement de rôle')
      }
    } catch (err) {
      console.error('Erreur:', err)
      alert('Erreur lors du changement de rôle')
    }
  }

  const handleCreateUser = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/rh/users`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      })
      if (response.ok) {
        const createdUser = await response.json()
        setPersonnel([...personnel, createdUser])
        setTempPassword(createdUser.temporaryPassword || null)
        setShowPasswordModal(true)
        setNewUser({ username: '', role: '', clearance: 1, department: '' })
        setShowCreateForm(false)
        setError('')
      } else {
        const err = await response.json()
        setError(err.message || 'Erreur lors de la création')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  const resetPassword = async () => {
    if (!selectedUser) return
    if (!window.confirm(`Êtes-vous sûr de vouloir réinitialiser le mot de passe de "${selectedUser.username}" ?`)) {
      return
    }
    try {
      const response = await fetch(`${API_BASE_URL}/rh/reset-password/${selectedUser.id}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setTempPassword(data.temporaryPassword)
        setShowPasswordModal(true)
      } else {
        alert('Erreur lors de la réinitialisation')
      }
    } catch (err) {
      console.error('Erreur:', err)
      alert('Erreur lors de la réinitialisation')
    }
  }

  const fetchLogs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/logs`, {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        setLogs(data || [])
        setShowLogsModal(true)
      }
    } catch (err) {
      console.error('Erreur:', err)
      alert('Erreur lors du chargement des logs')
    }
  }

  const filteredPersonnel = personnel.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.department.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            {personnel.length} membres du personnel
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            padding: '10px 16px',
            background: showCreateForm ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#fff',
            cursor: 'pointer',
            transition: 'opacity 0.15s ease'
          }}
        >
          {showCreateForm ? 'Annuler' : '+ Nouveau membre'}
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

      {/* Create User Form */}
      {showCreateForm && (
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: '0 0 20px' }}>
            Créer un nouveau membre
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
                Identifiant
              </label>
              <Input
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                placeholder="email@fondation.scp"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
                Département
              </label>
              <Input
                value={newUser.department}
                onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                placeholder="Département"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
                Rôle (personnalisé)
              </label>
              <Input
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                placeholder="Ex: scientifique, admin, securite..."
              />
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                Exemples: scientifique, securite, administration, direction, staff, admin, ia
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
                Niveau Clearance
              </label>
              <Select
                value={newUser.clearance}
                onChange={(e) => setNewUser({ ...newUser, clearance: parseInt(e.target.value) })}
              >
                <option value="1">Niveau 1</option>
                <option value="2">Niveau 2</option>
                <option value="3">Niveau 3</option>
                <option value="4">Niveau 4</option>
                <option value="5">Niveau 5</option>
              </Select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <button
                onClick={handleCreateUser}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                Créer le membre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* Personnel List */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          {/* Search */}
          <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#fff',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* List */}
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                Chargement...
              </div>
            ) : filteredPersonnel.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                Aucun résultat
              </div>
            ) : (
              filteredPersonnel.map((user) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    cursor: 'pointer',
                    background: selectedUser?.id === user.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedUser?.id !== user.id) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                  }}
                  onMouseLeave={(e) => {
                    if (selectedUser?.id !== user.id) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: user.suspended
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: user.suspended ? '#ef4444' : '#fff'
                    }}>
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: user.suspended ? 'rgba(255,255,255,0.4)' : '#fff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        textDecoration: user.suspended ? 'line-through' : 'none'
                      }}>
                        {user.username}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: 'rgba(255,255,255,0.4)',
                        marginTop: '2px'
                      }}>
                        {user.department || 'Sans département'}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '11px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: '#60a5fa'
                    }}>
                      Niv. {user.clearance}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* User Details */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          {selectedUser ? (
            <>
              {/* User Header */}
              <div style={{
                padding: '24px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    background: selectedUser.suspended
                      ? 'rgba(239, 68, 68, 0.2)'
                      : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    fontWeight: 600,
                    color: selectedUser.suspended ? '#ef4444' : '#fff'
                  }}>
                    {selectedUser.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: 600,
                      color: '#fff',
                      margin: 0
                    }}>
                      {selectedUser.username}
                    </h3>
                    <p style={{
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.4)',
                      margin: '4px 0 0'
                    }}>
                      {selectedUser.department || 'Sans département'} • {selectedUser.role}
                    </p>
                  </div>
                </div>
                <div style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 500,
                  background: selectedUser.suspended ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: selectedUser.suspended ? '#f87171' : '#34d399'
                }}>
                  {selectedUser.suspended ? '● Suspendu' : '● Actif'}
                </div>
              </div>

              {/* User Actions */}
              <div style={{
                padding: '24px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '24px'
              }}>
                {/* Clearance */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>
                    Niveau de clearance
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[1, 2, 3, 4, 5].map(level => (
                      <button
                        key={level}
                        onClick={() => updateClearance(level)}
                        style={{
                          flex: 1,
                          padding: '10px',
                          background: selectedUser.clearance === level
                            ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                            : 'rgba(255,255,255,0.03)',
                          border: selectedUser.clearance === level
                            ? 'none'
                            : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 500,
                          color: selectedUser.clearance === level ? '#fff' : 'rgba(255,255,255,0.5)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>
                    Statut du compte
                  </label>
                  <button
                    onClick={toggleSuspend}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      background: selectedUser.suspended ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      border: `1px solid ${selectedUser.suspended ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: selectedUser.suspended ? '#34d399' : '#f87171',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {selectedUser.suspended ? 'Réactiver le compte' : 'Suspendre le compte'}
                  </button>
                </div>
              </div>

              {/* Change Role (Admin only) */}
              {user?.role === 'admin' && (
                <div style={{
                  padding: '24px',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  borderBottom: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>
                    Modifier le rôle
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={selectedUser.role}
                      onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
                      placeholder="Nouveau rôle..."
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        fontSize: '13px',
                        color: '#fff',
                        outline: 'none'
                      }}
                    />
                    <button
                      onClick={() => changeRole(selectedUser.role)}
                      style={{
                        padding: '10px 16px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      Confirmer
                    </button>
                  </div>
                </div>
              )}

              {/* Delete Button (Admin only) */}
              {user?.role === 'admin' && (
                <div style={{
                  padding: '24px',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  borderBottom: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <button
                    onClick={deleteUser}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.5)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#ff4444',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)'
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.7)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)'
                    }}
                  >
                    🗑️ Supprimer cet utilisateur
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  onClick={resetPassword}
                  style={{
                    padding: '10px 16px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  🔐 Réinitialiser mot de passe
                </button>
                {user?.role === 'admin' && (
                  <button
                    onClick={fetchLogs}
                    style={{
                      padding: '10px 16px',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    📋 Voir les logs
                  </button>
                )}
              </div>

              {/* Notes */}
              <div style={{ padding: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
                  Notes RH ({notes.length})
                </label>

                {/* Notes List */}
                <div style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {notes.length === 0 ? (
                    <div style={{
                      padding: '20px',
                      textAlign: 'center',
                      color: 'rgba(255,255,255,0.3)',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '8px'
                    }}>
                      Aucune note
                    </div>
                  ) : (
                    notes.map(note => (
                      <div
                        key={note.id}
                        style={{
                          padding: '12px 14px',
                          background: 'rgba(255,255,255,0.02)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.04)'
                        }}
                      >
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                          {note.content}
                        </p>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '6px', display: 'block' }}>
                          {new Date(note.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Note */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Ajouter une note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addNote()}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#fff',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={addNote}
                    style={{
                      padding: '10px 20px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    Ajouter
                  </button>
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
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>◇</div>
              <p style={{ fontSize: '14px' }}>Sélectionnez un membre du personnel</p>
            </div>
          )}
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && tempPassword && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(20,34,74,0.95) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '400px',
            textAlign: 'center'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#fff', margin: '0 0 16px' }}>
              ✓ Utilisateur créé
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', margin: '0 0 24px' }}>
              Mot de passe temporaire généré automatiquement :
            </p>
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '2px solid rgba(59, 130, 246, 0.5)',
              borderRadius: '12px',
              padding: '16px',
              margin: '0 0 24px',
              fontFamily: 'monospace',
              fontSize: '18px',
              fontWeight: 600,
              color: '#3b82f6',
              wordBreak: 'break-all'
            }}>
              {tempPassword}
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '0 0 24px' }}>
              ⚠️ Ce mot de passe a également été posté sur Discord
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(tempPassword)
                alert('Mot de passe copié')
              }}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#fff',
                cursor: 'pointer',
                marginRight: '12px'
              }}
            >
              📋 Copier
            </button>
            <button
              onClick={() => setShowPasswordModal(false)}
              style={{
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {showLogsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(20,34,74,0.95) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '800px',
            maxHeight: '600px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#fff', margin: 0 }}>
              📋 Journal des actions (50 dernières)
            </h2>
            <div style={{
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {logs.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.5)' }}>Aucun log</p>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                  }}>
                    <div style={{ color: '#3b82f6', fontWeight: 600 }}>
                      [{new Date(log.created_at).toLocaleString()}] <span style={{ color: '#10b981' }}>{log.action}</span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                      Par: {log.username || 'Système'} | Détails: {log.details || 'N/A'}
                    </div>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => setShowLogsModal(false)}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default RH
