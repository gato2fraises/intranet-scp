import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Documents from './Dashboard/Documents'
import Mail from './Dashboard/Mail'
import RH from './Dashboard/RH'
import Staff from './Dashboard/Staff'
import Annuaire from './Dashboard/Annuaire'
import Modules from './Dashboard/Modules'

type TabType = 'overview' | 'documents' | 'mail' | 'annuaire' | 'rh' | 'staff' | 'modules'

const MENU_ITEMS = [
  { id: 'overview' as TabType, label: 'Tableau de bord', icon: '◉' },
  { id: 'documents' as TabType, label: 'Documents', icon: '◎' },
  { id: 'mail' as TabType, label: 'Messagerie', icon: '◈' },
  { id: 'annuaire' as TabType, label: 'Annuaire', icon: '◍' },
  { id: 'rh' as TabType, label: 'Ressources Humaines', icon: '◇', admin: true },
  { id: 'modules' as TabType, label: 'Modules', icon: '⚙', admin: true },
  { id: 'staff' as TabType, label: 'Supervision', icon: '◆', staff: true },
]

// Stats card component
const StatCard: React.FC<{ label: string; value: string | number; accent?: string }> = ({ label, value, accent = '#3b82f6' }) => (
  <div style={{
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  }}>
    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{label}</span>
    <span style={{ fontSize: '28px', fontWeight: 600, color: accent }}>{value}</span>
  </div>
)

// Overview component
const Overview: React.FC<{ user: any }> = ({ user }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
    {/* Welcome */}
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
        Bienvenue, {user.username}
      </h2>
      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
        Voici un aperçu de votre activité sur l'intranet.
      </p>
    </div>

    {/* Stats Grid */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
      <StatCard label="Clearance" value={`Niveau ${user.clearance}`} accent="#10b981" />
      <StatCard label="Département" value={user.department || 'Non assigné'} accent="#8b5cf6" />
    </div>

    {/* Quick Info */}
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px',
      padding: '24px'
    }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>
        Informations du compte
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Identifiant</span>
          <span style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>{user.username}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Rôle</span>
          <span style={{ color: '#fff', fontSize: '14px', fontWeight: 500, textTransform: 'capitalize' }}>{user.role}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Département</span>
          <span style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>{user.department || '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Statut</span>
          <span style={{ color: '#10b981', fontSize: '14px', fontWeight: 500 }}>● Actif</span>
        </div>
      </div>
    </div>
  </div>
)

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!user) return null

  const isAdmin = user.role === 'admin'
  const isStaff = user.role === 'staff' || isAdmin
  const canAccessRH = isAdmin || ['administration', 'direction', 'staff'].includes(user.role)

  const visibleMenuItems = MENU_ITEMS.filter(item => {
    if (item.admin) return canAccessRH
    if (item.staff) return isStaff
    return true
  })

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#0a0a0b',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Sidebar */}
      <aside style={{
        width: '260px',
        background: '#0f0f10',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 100
      }}>
        {/* Logo */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 700,
              color: '#fff'
            }}>
              S
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>Fondation SCP</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Intranet</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: '16px 12px', flex: 1 }}>
          <div style={{ marginBottom: '8px', padding: '0 12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Navigation
            </span>
          </div>
          {visibleMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                marginBottom: '4px',
                background: activeTab === item.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== item.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
              }}
              onMouseLeave={(e) => {
                if (activeTab !== item.id) e.currentTarget.style.background = 'transparent'
              }}
            >
              <span style={{
                fontSize: '16px',
                color: activeTab === item.id ? '#3b82f6' : 'rgba(255,255,255,0.4)'
              }}>
                {item.icon}
              </span>
              <span style={{
                fontSize: '14px',
                fontWeight: activeTab === item.id ? 500 : 400,
                color: activeTab === item.id ? '#fff' : 'rgba(255,255,255,0.6)'
              }}>
                {item.label}
              </span>
              {item.admin && (
                <span style={{
                  marginLeft: 'auto',
                  fontSize: '10px',
                  padding: '2px 6px',
                  background: 'rgba(139, 92, 246, 0.2)',
                  color: '#a78bfa',
                  borderRadius: '4px',
                  fontWeight: 500
                }}>
                  ADMIN
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* User Section */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '10px',
            marginBottom: '12px'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 600,
              color: '#fff'
            }}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.username}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                Clearance {user.clearance}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            style={{
              width: '100%',
              padding: '10px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              color: '#ef4444',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
            }}
          >
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        marginLeft: '260px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Top Bar */}
        <header style={{
          height: '64px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          background: '#0a0a0b',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', margin: 0 }}>
              {MENU_ITEMS.find(m => m.id === activeTab)?.label}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
              {time.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
              {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </header>

        {/* Content Area */}
        <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {activeTab === 'overview' && <Overview user={user} />}
          {activeTab === 'documents' && <Documents />}
          {activeTab === 'mail' && <Mail />}
          {activeTab === 'annuaire' && <Annuaire />}
          {activeTab === 'rh' && canAccessRH && <RH />}
          {activeTab === 'modules' && user.role === 'admin' && <Modules />}
          {activeTab === 'staff' && isStaff && <Staff />}
        </div>
      </main>
    </div>
  )
}
