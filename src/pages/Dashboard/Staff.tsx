import React, { useState, useEffect } from 'react'
import { useAuth, getAuthHeaders } from '../../contexts/AuthContext'
import { API_BASE_URL } from '../../config'

interface Log {
  id: number
  action: string
  user_id: number
  details: string
  ip_address: string
  created_at: string
  user?: { username: string }
}

const Staff: React.FC = () => {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [limit, setLimit] = useState(50)
  useAuth()

  useEffect(() => {
    fetchLogs()
  }, [limit])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `${API_BASE_URL}/logs?limit=${limit}&offset=0`,
        {
          headers: getAuthHeaders(),
        }
      )
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Accès refusé - logs réservés au Staff')
        }
        throw new Error('Erreur lors du chargement des logs')
      }
      const data = await response.json()
      setLogs(data.logs || [])
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-foundation-600">
        Chargement des logs...
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-foundation-900">Supervision - Logs Système</h2>
        <select
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value))}
          className="px-3 py-1 border border-foundation-300 rounded-lg text-sm"
        >
          <option value={10}>10</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value={500}>500</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          ❌ {error}
        </div>
      )}

      {logs.length === 0 ? (
        <p className="text-foundation-600 text-center py-8">Aucun log</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foundation-200">
                <th className="text-left py-3 px-4 font-semibold text-foundation-900">Action</th>
                <th className="text-left py-3 px-4 font-semibold text-foundation-900">Utilisateur</th>
                <th className="text-left py-3 px-4 font-semibold text-foundation-900">Détails</th>
                <th className="text-left py-3 px-4 font-semibold text-foundation-900">IP</th>
                <th className="text-left py-3 px-4 font-semibold text-foundation-900">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-foundation-100 hover:bg-foundation-50">
                  <td className="py-3 px-4">
                    <span className="bg-foundation-100 text-foundation-800 px-2 py-1 rounded text-xs font-medium">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-foundation-900 font-medium">
                    {log.user?.username || `User #${log.user_id}`}
                  </td>
                  <td className="py-3 px-4 text-foundation-600 max-w-xs truncate">
                    {log.details || '—'}
                  </td>
                  <td className="py-3 px-4 text-foundation-500 text-xs font-mono">
                    {log.ip_address}
                  </td>
                  <td className="py-3 px-4 text-foundation-500 text-xs whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-foundation-500 mt-4">
        Total: {logs.length} log(s) • API: localhost:3000
      </p>
    </div>
  )
}

export default Staff
