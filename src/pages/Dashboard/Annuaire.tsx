import React, { useState, useEffect } from 'react'
import { useAuth, getAuthHeaders } from '../../contexts/AuthContext'
import { API_BASE_URL } from '../../config'

interface Person {
  id: number
  username: string
  role: string
  clearance: number
  department: string
  suspended: boolean
}

const Annuaire: React.FC = () => {
  const [personnel, setPersonnel] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDepartment, setFilterDepartment] = useState<string>('all')
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  useAuth()

  useEffect(() => {
    fetchPersonnel()
  }, [])

  const fetchPersonnel = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/annuaire`, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error('Erreur lors du chargement de l\'annuaire')
      const data = await response.json()
      setPersonnel(data)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const departments = ['all', ...Array.from(new Set(personnel.map(p => p.department).filter(Boolean)))]

  const filteredPersonnel = personnel.filter(person => {
    if (person.suspended) return false
    const matchesSearch = person.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          person.department?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDept = filterDepartment === 'all' || person.department === filterDepartment
    return matchesSearch && matchesDept
  })

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      'admin': 'Administrateur',
      'staff': 'Staff',
      'scientifique': 'Scientifique',
      'securite': 'Sécurité',
      'personnel': 'Personnel'
    }
    return labels[role] || role
  }

  const getClearanceColor = (level: number) => {
    const colors: Record<number, { bg: string; text: string }> = {
      1: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399' },
      2: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa' },
      3: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24' },
      4: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171' },
      5: { bg: 'rgba(139, 92, 246, 0.15)', text: '#a78bfa' },
      6: { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6' }
    }
    return colors[level] || colors[1]
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
          {filteredPersonnel.length} membre{filteredPersonnel.length > 1 ? 's' : ''} trouvé{filteredPersonnel.length > 1 ? 's' : ''}
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Department Filter */}
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            style={{
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#fff',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="all">Tous les départements</option>
            {departments.filter(d => d !== 'all').map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
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

      {/* Search */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        padding: '16px'
      }}>
        <input
          type="text"
          placeholder="Rechercher par nom ou département..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedPerson ? '2fr 1fr' : '1fr', gap: '24px' }}>
        {/* Personnel Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px'
        }}>
          {loading ? (
            <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
              Chargement...
            </div>
          ) : filteredPersonnel.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
              Aucun résultat
            </div>
          ) : (
            filteredPersonnel.map((person) => (
              <div
                key={person.id}
                onClick={() => setSelectedPerson(person)}
                style={{
                  background: selectedPerson?.id === person.id ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)',
                  border: selectedPerson?.id === person.id ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (selectedPerson?.id !== person.id) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedPerson?.id !== person.id) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#fff',
                    flexShrink: 0
                  }}>
                    {person.username.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#fff',
                      marginBottom: '4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {person.username}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.4)'
                    }}>
                      {person.department || 'Sans département'}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontWeight: 500,
                    background: getClearanceColor(person.clearance).bg,
                    color: getClearanceColor(person.clearance).text
                  }}>
                    CL-{person.clearance}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Person Details Panel */}
        {selectedPerson && (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            overflow: 'hidden',
            position: 'sticky',
            top: '24px',
            alignSelf: 'start'
          }}>
            {/* Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center'
            }}>
              <button
                onClick={() => setSelectedPerson(null)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '18px',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                fontWeight: 600,
                color: '#fff',
                margin: '0 auto 16px'
              }}>
                {selectedPerson.username.charAt(0).toUpperCase()}
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', margin: '0 0 8px' }}>
                {selectedPerson.username}
              </h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                {getRoleLabel(selectedPerson.role)}
              </p>
            </div>

            {/* Info */}
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Département</span>
                  <span style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>
                    {selectedPerson.department || '—'}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Clearance</span>
                  <span style={{
                    fontSize: '12px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontWeight: 500,
                    background: getClearanceColor(selectedPerson.clearance).bg,
                    color: getClearanceColor(selectedPerson.clearance).text
                  }}>
                    Niveau {selectedPerson.clearance}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px 0'
                }}>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Rôle</span>
                  <span style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>
                    {getRoleLabel(selectedPerson.role)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Annuaire
