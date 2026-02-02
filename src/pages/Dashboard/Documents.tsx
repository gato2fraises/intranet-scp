import React, { useState, useEffect } from 'react'
import { useAuth, getAuthHeaders } from '../../contexts/AuthContext'
import { API_BASE_URL } from '../../config'

interface Document {
  id: number
  title: string
  body: string
  type: string
  status: 'draft' | 'published' | 'archived'
  author_id: number
  author_username: string
  department: string
  clearance: number
  tags: string[]
  version: number
  created_at: string
  updated_at: string
}

interface DocumentVersion {
  id: number
  version: number
  title: string
  body: string
  edited_by_username: string
  change_summary: string
  created_at: string
}

interface DocumentLog {
  id: number
  action: string
  actor_username: string
  details: string
  created_at: string
}

interface DocumentPermission {
  id: number
  permission_type: string
  target_id: string
  is_allowed: number
}

const DOC_TYPES = [
  'rapport_incident',
  'rapport_scientifique',
  'procedure',
  'note_interne',
  'document_rh',
  'journal_garde',
  'compte_rendu_reunion',
  'avis_sanction',
  'directive_site',
]

const DOC_TYPES_LABELS: Record<string, string> = {
  rapport_incident: 'Rapport d\'Incident',
  rapport_scientifique: 'Rapport Scientifique',
  procedure: 'Procédure',
  note_interne: 'Note Interne',
  document_rh: 'Document RH',
  journal_garde: 'Journal de Garde',
  compte_rendu_reunion: 'Compte-rendu de Réunion',
  avis_sanction: 'Avis de Sanction',
  directive_site: 'Directive de Site',
}

const CLEARANCE_LEVELS = [
  { value: 0, label: '0 - Public' },
  { value: 1, label: '1 - Restreint' },
  { value: 2, label: '2 - Confidentiel' },
  { value: 3, label: '3 - Hautement Confidentiel' },
  { value: 4, label: '4 - O5' },
  { value: 5, label: '5 - O5 Supreme' },
  { value: 6, label: '6 - Administrateur' },
]

const DEPARTMENTS = ['general', 'securite', 'recherche', 'administratif', 'medical', 'direction']

const DocumentsPage: React.FC = () => {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')

  // Forms
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    body: '',
    type: 'rapport_incident',
    department: 'general',
    clearance: 0,
    tags: [] as string[],
    reference_id: '',
  })

  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [logs, setLogs] = useState<DocumentLog[]>([])
  const [permissions, setPermissions] = useState<DocumentPermission[]>([])
  const [newPermission, setNewPermission] = useState({ type: 'role', target_id: '', allow: true })

  const [activeTab, setActiveTab] = useState<'content' | 'versions' | 'logs' | 'permissions'>('content')

  // Load documents
  useEffect(() => {
    loadDocuments()
  }, [searchQuery, selectedType, selectedStatus, selectedDepartment])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (selectedType) params.append('type', selectedType)
      if (selectedStatus) params.append('status', selectedStatus)
      if (selectedDepartment) params.append('department', selectedDepartment)

      const response = await fetch(`${API_BASE_URL}/documents?${params}`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) throw new Error('Failed to load documents')

      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading documents')
    } finally {
      setLoading(false)
    }
  }

  const loadDocumentDetails = async (docId: number) => {
    try {
      // Load main document
      const docRes = await fetch(`${API_BASE_URL}/documents/${docId}`, {
        headers: getAuthHeaders(),
      })
      if (!docRes.ok) throw new Error('Failed to load document')
      const doc = await docRes.json()
      setSelectedDoc(doc)

      // Load versions
      const versRes = await fetch(`${API_BASE_URL}/documents/${docId}/versions`, {
        headers: getAuthHeaders(),
      })
      if (versRes.ok) {
        const { versions } = await versRes.json()
        setVersions(versions)
      }

      // Load logs if author or admin
      try {
        const logsRes = await fetch(`${API_BASE_URL}/documents/${docId}/logs`, {
          headers: getAuthHeaders(),
        })
        if (logsRes.ok) {
          const { logs } = await logsRes.json()
          setLogs(logs)
        }
      } catch {}

      // Load permissions if author or admin
      try {
        const permsRes = await fetch(`${API_BASE_URL}/documents/${docId}/permissions`, {
          headers: getAuthHeaders(),
        })
        if (permsRes.ok) {
          const { permissions } = await permsRes.json()
          setPermissions(permissions)
        }
      } catch {}

      setActiveTab('content')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading document')
    }
  }

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch(`${API_BASE_URL}/documents`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Failed to create document')

      setShowCreateModal(false)
      setFormData({ title: '', body: '', type: 'rapport_incident', department: 'general', clearance: 0, tags: [], reference_id: '' })
      await loadDocuments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating document')
    }
  }

  const handleEditDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDoc) return

    try {
      const response = await fetch(`${API_BASE_URL}/documents/${selectedDoc.id}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          change_summary: `Modified by ${user?.username}`,
        }),
      })

      if (!response.ok) throw new Error('Failed to update document')

      setShowEditModal(false)
      await loadDocumentDetails(selectedDoc.id)
      await loadDocuments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating document')
    }
  }

  const handlePublish = async () => {
    if (!selectedDoc) return

    try {
      const response = await fetch(`${API_BASE_URL}/documents/${selectedDoc.id}/publish`, {
        method: 'POST',
        headers: getAuthHeaders(),
      })

      if (!response.ok) throw new Error('Failed to publish document')

      await loadDocumentDetails(selectedDoc.id)
      await loadDocuments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error publishing document')
    }
  }

  const handleArchive = async () => {
    if (!selectedDoc) return

    try {
      const response = await fetch(`${API_BASE_URL}/documents/${selectedDoc.id}/archive`, {
        method: 'POST',
        headers: getAuthHeaders(),
      })

      if (!response.ok) throw new Error('Failed to archive document')

      await loadDocumentDetails(selectedDoc.id)
      await loadDocuments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error archiving document')
    }
  }

  const handleDelete = async () => {
    if (!selectedDoc) return

    if (!window.confirm('Soft delete this document? It can be restored by admin.')) return

    try {
      const response = await fetch(`${API_BASE_URL}/documents/${selectedDoc.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })

      if (!response.ok) throw new Error('Failed to delete document')

      setSelectedDoc(null)
      await loadDocuments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting document')
    }
  }

  const handleAddPermission = async () => {
    if (!selectedDoc) return

    try {
      const response = await fetch(`${API_BASE_URL}/documents/${selectedDoc.id}/permissions`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permission_type: newPermission.type,
          target_id: newPermission.target_id,
          is_allowed: newPermission.allow,
        }),
      })

      if (!response.ok) throw new Error('Failed to add permission')

      setNewPermission({ type: 'role', target_id: '', allow: true })
      // Reload permissions
      const permsRes = await fetch(`${API_BASE_URL}/documents/${selectedDoc.id}/permissions`, {
        headers: getAuthHeaders(),
      })
      if (permsRes.ok) {
        const { permissions } = await permsRes.json()
        setPermissions(permissions)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error adding permission')
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-200 text-gray-800'
      case 'published':
        return 'bg-green-200 text-green-800'
      case 'archived':
        return 'bg-purple-200 text-purple-800'
      case 'in_validation':
        return 'bg-yellow-200 text-yellow-800'
      case 'refused':
        return 'bg-red-200 text-red-800'
      default:
        return 'bg-gray-200 text-gray-800'
    }
  }

  const getClearanceBadgeColor = (clearance: number) => {
    if (clearance === 0) return 'bg-blue-100 text-blue-800'
    if (clearance <= 2) return 'bg-green-100 text-green-800'
    if (clearance <= 4) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const canEdit = selectedDoc && (selectedDoc.author_id === user?.id || user?.role === 'staff' || user?.role === 'direction')
  const canPublish = selectedDoc && selectedDoc.status === 'draft' && (selectedDoc.author_id === user?.id || user?.role === 'staff')
  const canArchive = selectedDoc && (selectedDoc.author_id === user?.id || user?.role === 'staff' || user?.role === 'direction')
  const canDelete = selectedDoc && (selectedDoc.author_id === user?.id || user?.role === 'staff')
  const canManagePerms = selectedDoc && (selectedDoc.author_id === user?.id || user?.role === 'staff')

  return (
    <div className="flex h-full gap-4 p-4">
      {/* Left: Document List */}
      <div className="w-96 flex flex-col gap-4 border-r border-gray-300 pr-4">
        <div>
          <h2 className="text-xl font-bold mb-4">Documents</h2>

          {/* Filters */}
          <div className="space-y-2 mb-4">
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="">All Types</option>
              {DOC_TYPES.map((type) => (
                <option key={type} value={type}>
                  {DOC_TYPES_LABELS[type]}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>

            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept.charAt(0).toUpperCase() + dept.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setFormData({ title: '', body: '', type: 'rapport_incident', department: 'general', clearance: 0, tags: [], reference_id: '' })
              setShowCreateModal(true)
            }}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            + New Document
          </button>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : documents.length === 0 ? (
            <p className="text-gray-500">No documents found</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => loadDocumentDetails(doc.id)}
                  className={`p-3 border border-gray-300 rounded cursor-pointer hover:bg-blue-50 ${
                    selectedDoc?.id === doc.id ? 'bg-blue-100 border-blue-500' : ''
                  }`}
                >
                  <div className="font-semibold text-sm truncate">{doc.title}</div>
                  <div className="text-xs text-gray-600">by {doc.author_username}</div>
                  <div className="flex gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded ${getStatusBadgeColor(doc.status)}`}>
                      {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${getClearanceBadgeColor(doc.clearance)}`}>
                      L{doc.clearance}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Document Details */}
      {selectedDoc ? (
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">{selectedDoc.title}</h1>
              <p className="text-gray-600">
                by {selectedDoc.author_username} • {new Date(selectedDoc.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <span className={`px-3 py-1 rounded ${getStatusBadgeColor(selectedDoc.status)}`}>
                {selectedDoc.status.charAt(0).toUpperCase() + selectedDoc.status.slice(1)}
              </span>
              <span className={`px-3 py-1 rounded ${getClearanceBadgeColor(selectedDoc.clearance)}`}>
                Level {selectedDoc.clearance}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {canEdit && (
              <button
                onClick={() => {
                  setFormData({
                    title: selectedDoc.title,
                    body: selectedDoc.body,
                    type: selectedDoc.type,
                    department: selectedDoc.department,
                    clearance: selectedDoc.clearance,
                    tags: selectedDoc.tags,
                    reference_id: '',
                  })
                  setShowEditModal(true)
                }}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                ✏️ Edit
              </button>
            )}

            {canPublish && (
              <button
                onClick={handlePublish}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                📤 Publish
              </button>
            )}

            {canArchive && (
              <button
                onClick={handleArchive}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                📦 Archive
              </button>
            )}

            {canDelete && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                🗑️ Delete
              </button>
            )}

            {canManagePerms && (
              <button
                onClick={() => setShowPermissionsModal(true)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                🔒 Permissions
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-300">
            {(['content', 'versions', 'logs', 'permissions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 border-b-2 ${
                  activeTab === tab ? 'border-blue-500 text-blue-600 font-semibold' : 'border-transparent text-gray-600'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Content Tab */}
          {activeTab === 'content' && (
            <div className="flex-1 overflow-y-auto">
              <div className="prose prose-sm max-w-none">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Type:</strong> {DOC_TYPES_LABELS[selectedDoc.type] || selectedDoc.type}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Department:</strong> {selectedDoc.department}
                </p>
                {selectedDoc.tags.length > 0 && (
                  <div className="mb-4">
                    <strong className="text-sm">Tags:</strong>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {selectedDoc.tags.map((tag) => (
                        <span key={tag} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="border-t pt-4 mt-4 whitespace-pre-wrap">{selectedDoc.body}</div>
              </div>
            </div>
          )}

          {/* Versions Tab */}
          {activeTab === 'versions' && (
            <div className="flex-1 overflow-y-auto">
              {versions.length === 0 ? (
                <p className="text-gray-500">No versions</p>
              ) : (
                <div className="space-y-3">
                  {versions.map((v) => (
                    <div key={v.id} className="border border-gray-300 p-3 rounded">
                      <p className="font-semibold">v{v.version}</p>
                      <p className="text-sm text-gray-600">{v.edited_by_username}</p>
                      <p className="text-sm text-gray-600">{new Date(v.created_at).toLocaleString()}</p>
                      {v.change_summary && <p className="text-sm mt-2">{v.change_summary}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div className="flex-1 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500">No logs</p>
              ) : (
                <div className="space-y-3">
                  {logs.map((l) => (
                    <div key={l.id} className="border border-gray-300 p-3 rounded text-sm">
                      <p className="font-semibold">{l.action.toUpperCase()}</p>
                      <p className="text-gray-600">by {l.actor_username}</p>
                      {l.details && <p className="text-gray-600">{l.details}</p>}
                      <p className="text-xs text-gray-500">{new Date(l.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Permissions Tab */}
          {activeTab === 'permissions' && canManagePerms && (
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-3">
                <h3 className="font-semibold">Permissions</h3>
                {permissions.length === 0 ? (
                  <p className="text-gray-500 text-sm">No specific permissions</p>
                ) : (
                  <div className="space-y-2">
                    {permissions.map((p) => (
                      <div key={p.id} className="flex justify-between items-center p-2 bg-gray-100 rounded text-sm">
                        <span>
                          {p.permission_type}: {p.target_id}
                        </span>
                        {p.is_allowed ? '✓' : '✗'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {error && <div className="p-3 bg-red-100 text-red-800 rounded">{error}</div>}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Select a document to view details
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create Document</h2>
            <form onSubmit={handleCreateDocument} className="space-y-4">
              <input
                type="text"
                placeholder="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                required
              />

              <textarea
                placeholder="Document body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded h-40"
                required
              />

              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              >
                {DOC_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {DOC_TYPES_LABELS[type]}
                  </option>
                ))}
              </select>

              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept.charAt(0).toUpperCase() + dept.slice(1)}
                  </option>
                ))}
              </select>

              <select
                value={formData.clearance}
                onChange={(e) => setFormData({ ...formData, clearance: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              >
                {CLEARANCE_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit Document</h2>
            <form onSubmit={handleEditDocument} className="space-y-4">
              <input
                type="text"
                placeholder="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                required
              />

              <textarea
                placeholder="Document body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded h-40"
                required
              />

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && selectedDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Manage Permissions</h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Current Permissions</h3>
                {permissions.map((p) => (
                  <div key={p.id} className="flex justify-between items-center p-2 bg-gray-100 rounded text-sm mb-2">
                    <span>
                      {p.permission_type}: {p.target_id}
                    </span>
                    {p.is_allowed ? '✓' : '✗'}
                  </div>
                ))}
              </div>

              <hr />

              <div>
                <h3 className="font-semibold mb-2">Add Permission</h3>
                <select
                  value={newPermission.type}
                  onChange={(e) => setNewPermission({ ...newPermission, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded mb-2"
                >
                  <option value="role">Role</option>
                  <option value="department">Department</option>
                  <option value="whitelist">Whitelist User</option>
                  <option value="blacklist">Blacklist User</option>
                </select>

                <input
                  type="text"
                  placeholder="Target (role/dept/user_id)"
                  value={newPermission.target_id}
                  onChange={(e) => setNewPermission({ ...newPermission, target_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded mb-2"
                />

                <button
                  onClick={handleAddPermission}
                  className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Add
                </button>
              </div>

              <button
                onClick={() => setShowPermissionsModal(false)}
                className="w-full px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DocumentsPage
