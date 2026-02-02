import React, { useState, useEffect } from 'react'
import { useAuth, getAuthHeaders } from '../../contexts/AuthContext'
import { API_BASE_URL } from '../../config'

interface Document {
  id: number
  title: string
  body: string
  type: string
  clearance: number
  author_id: number
  archived: boolean
  created_at: string
}

const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDoc, setSelectedDoc] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  useAuth()

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/documents`, {
        headers: getAuthHeaders(),
      })
      if (!response.ok) throw new Error('Erreur lors du chargement des documents')
      const data = await response.json()
      setDocuments(data.documents || [])
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const selectedDocument = documents.find(d => d.id === selectedDoc)
  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getClearanceColor = (level: number) => {
    const colors: Record<number, { bg: string; text: string }> = {
      1: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399' },
      2: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa' },
      3: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24' },
      4: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171' },
      5: { bg: 'rgba(139, 92, 246, 0.15)', text: '#a78bfa' }
    }
    return colors[level] || colors[1]
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
          {documents.length} documents disponibles
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

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* Documents List */}
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
              placeholder="Rechercher un document..."
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
            ) : filteredDocuments.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                Aucun document
              </div>
            ) : (
              filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc.id)}
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    cursor: 'pointer',
                    background: selectedDoc === doc.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedDoc !== doc.id) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                  }}
                  onMouseLeave={(e) => {
                    if (selectedDoc !== doc.id) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#fff',
                        marginBottom: '4px'
                      }}>
                        {doc.title}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: 'rgba(255,255,255,0.4)'
                      }}>
                        {doc.type}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '10px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontWeight: 500,
                      ...getClearanceColor(doc.clearance),
                      background: getClearanceColor(doc.clearance).bg,
                      color: getClearanceColor(doc.clearance).text
                    }}>
                      CL-{doc.clearance}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.3)',
                    marginTop: '8px'
                  }}>
                    {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Document Details */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          {selectedDocument ? (
            <>
              {/* Document Header */}
              <div style={{
                padding: '24px',
                borderBottom: '1px solid rgba(255,255,255,0.06)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: 600,
                      color: '#fff',
                      margin: 0
                    }}>
                      {selectedDocument.title}
                    </h3>
                    <p style={{
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.4)',
                      margin: '8px 0 0'
                    }}>
                      {selectedDocument.type} • {new Date(selectedDocument.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 500,
                    background: getClearanceColor(selectedDocument.clearance).bg,
                    color: getClearanceColor(selectedDocument.clearance).text
                  }}>
                    Clearance {selectedDocument.clearance}
                  </div>
                </div>
              </div>

              {/* Document Content */}
              <div style={{ padding: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
                  Contenu
                </label>
                <div style={{
                  padding: '20px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.8)',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  {selectedDocument.body}
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
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>◎</div>
              <p style={{ fontSize: '14px' }}>Sélectionnez un document</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Documents
