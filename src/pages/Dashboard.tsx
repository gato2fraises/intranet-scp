import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Mail, FileText, Users, Settings, Clock, CheckCircle } from 'lucide-react'
import Documents from './Dashboard/Documents'
import Mail from './Dashboard/Mail'
import RH from './Dashboard/RH'
import Staff from './Dashboard/Staff'
import Annuaire from './Dashboard/Annuaire'
import Modules from './Dashboard/Modules'

type TabType = 'overview' | 'documents' | 'mail' | 'annuaire' | 'rh' | 'staff' | 'modules'

interface DashboardData {
  userInfo: {
    id: number
    username: string
    role: string
    department: string
    clearance: number
    status: 'active' | 'suspended'
    sessionStartTime: string
  }
  modulesStatus: Record<string, string>
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
    recentMessages: any[]
    recentDocuments: any[]
    systemNotifications: any[]
  }
  announcements: any[]
  quickActions: Array<{
    id: string
    label: string
    icon: string
    action: string
  }>
}

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
const Overview: React.FC<{ dashboardData: DashboardData; user: any }> = ({ dashboardData, user }) => {
  const navigate = useNavigate()

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'actif':
        return 'bg-green-100 text-green-800'
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800'
      case 'desactive':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'staff':
        return 'bg-red-100 text-red-800'
      case 'direction':
        return 'bg-purple-100 text-purple-800'
      case 'scientifique':
        return 'bg-blue-100 text-blue-800'
      case 'securite':
        return 'bg-orange-100 text-orange-800'
      case 'administration':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getAnnouncementPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'border-l-4 border-red-500 bg-red-50'
      case 'high':
        return 'border-l-4 border-orange-500 bg-orange-50'
      case 'medium':
        return 'border-l-4 border-yellow-500 bg-yellow-50'
      default:
        return 'border-l-4 border-blue-500 bg-blue-50'
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Messaging Indicators */}
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '16px' }}>
          📧 Messagerie
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Non lus" value={dashboardData.messagingIndicators.unread} accent="#3b82f6" />
          <StatCard label="Reçus (7j)" value={dashboardData.messagingIndicators.receivedPeriod} accent="#10b981" />
          <StatCard label="Envoyés (7j)" value={dashboardData.messagingIndicators.sentPeriod} accent="#8b5cf6" />
        </div>
      </div>

      {/* Document Indicators */}
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '16px' }}>
          📄 Documents
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Créés" value={dashboardData.documentIndicators.created} accent="#10b981" />
          <StatCard label="Consultés (7j)" value={dashboardData.documentIndicators.recentlyViewed} accent="#f59e0b" />
          {dashboardData.documentIndicators.pendingValidation > 0 && (
            <StatCard label="En validation" value={dashboardData.documentIndicators.pendingValidation} accent="#ef4444" />
          )}
        </div>
      </div>

      {/* Modules Status */}
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '16px' }}>
          ⚙️ État des modules
        </h3>
        <div className="grid grid-cols-5 gap-3">
          {Object.entries(dashboardData.modulesStatus).map(([module, status]) => (
            <div key={module} className="p-3 rounded-lg bg-opacity-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', textTransform: 'capitalize' }}>{module}</p>
              <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                status === 'actif' ? 'bg-green-500 text-white' :
                status === 'maintenance' ? 'bg-yellow-500 text-white' :
                'bg-gray-500 text-white'
              }`}>
                {status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      {(dashboardData.recentActivity.recentMessages.length > 0 || dashboardData.recentActivity.recentDocuments.length > 0) && (
        <div className="grid grid-cols-2 gap-6">
          {/* Recent Messages */}
          {dashboardData.recentActivity.recentMessages.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>📨 Messages récents</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {dashboardData.recentActivity.recentMessages.slice(0, 3).map((msg) => (
                  <div key={msg.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#fff', marginBottom: '4px' }}>{msg.subject}</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>De: {msg.sender_username}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Documents */}
          {dashboardData.recentActivity.recentDocuments.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>📋 Documents récents</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {dashboardData.recentActivity.recentDocuments.slice(0, 3).map((doc) => (
                  <div key={doc.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#fff', marginBottom: '4px' }}>{doc.title}</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Type: {doc.type}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Announcements */}
      {dashboardData.announcements.length > 0 && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '16px' }}>
            📢 Annonces
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {dashboardData.announcements.map((announcement) => (
              <div
                key={announcement.id}
                style={{
                  padding: '16px',
                  borderLeft: `4px solid ${
                    announcement.priority === 'critical' ? '#ef4444' :
                    announcement.priority === 'high' ? '#f59e0b' :
                    announcement.priority === 'medium' ? '#eab308' :
                    '#3b82f6'
                  }`,
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '8px',
                  border: `1px solid rgba(255,255,255,0.06)`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>{announcement.title}</h4>
                  <span style={{ fontSize: '11px', padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>
                    {announcement.priority}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: '8px 0 0 0' }}>{announcement.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export const Dashboard: React.FC = () => {
  const { user, logout, token } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [time, setTime] = useState(new Date())
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const API_BASE_URL = 'http://localhost:3001'

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!token || !user) return

    const fetchDashboardData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) throw new Error('Failed to fetch dashboard data')

        const result = await response.json()
        setDashboardData(result.data)
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [token, user])

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
          {activeTab === 'overview' && !loading && dashboardData && <Overview dashboardData={dashboardData} user={user} />}
          {activeTab === 'overview' && loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Chargement...</span>
            </div>
          )}
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
