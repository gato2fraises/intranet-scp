import React, { useState, useEffect } from 'react'
import { useAuth, getAuthHeaders } from '../../contexts/AuthContext'
import { API_BASE_URL } from '../../config'

interface Module {
  id: number
  name: string
  description: string
  enabled: number
  config: string
  created_at: string
  updated_at: string
}

const Modules: React.FC = () => {
  const { user } = useAuth()
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchModules()
  }, [])

  const fetchModules = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/modules`, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error('Erreur lors du chargement des modules')
      const data = await response.json()
      setModules(data || [])
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const toggleModule = async (moduleName: string, currentState: boolean) => {
    if (user?.role !== 'admin') {
      alert('Seuls les administrateurs peuvent modifier les modules')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/modules/${moduleName}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentState })
      })
      if (response.ok) {
        await fetchModules()
      } else {
        alert('Erreur lors de la modification du module')
      }
    } catch (err) {
      console.error('Erreur:', err)
      alert('Erreur lors de la modification')
    }
  }

  if (loading) {
    return <div style={{ padding: '24px', color: 'rgba(255,255,255,0.5)' }}>Chargement...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#fff', margin: '0 0 8px' }}>
          ⚙️ Gestion des modules
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
          Activez ou désactivez les modules de l'intranet
        </p>
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

      {/* Modules Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {modules.map((mod) => (
          <div key={mod.id} style={{
            background: 'rgba(255,255,255,0.02)',
            border: `1px solid ${mod.enabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: 0 }}>
                  {mod.name}
                </h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0' }}>
                  {mod.description}
                </p>
              </div>
              <div style={{
                padding: '6px 12px',
                background: mod.enabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                border: `1px solid ${mod.enabled ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                color: mod.enabled ? '#10b981' : '#ef4444'
              }}>
                {mod.enabled ? '✓ Activé' : '✕ Désactivé'}
              </div>
            </div>

            {/* Toggle Button */}
            {user?.role === 'admin' && (
              <button
                onClick={() => toggleModule(mod.name, mod.enabled === 1)}
                style={{
                  padding: '8px 12px',
                  background: mod.enabled
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(16, 185, 129, 0.2)',
                  border: mod.enabled
                    ? '1px solid rgba(239, 68, 68, 0.5)'
                    : '1px solid rgba(16, 185, 129, 0.5)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: mod.enabled ? '#ff4444' : '#10b981',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.8'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1'
                }}
              >
                {mod.enabled ? '🔴 Désactiver' : '🟢 Activer'}
              </button>
            )}
          </div>
        ))}
      </div>

      {modules.length === 0 && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.3)'
        }}>
          Aucun module disponible
        </div>
      )}
    </div>
  )
}

export default Modules
