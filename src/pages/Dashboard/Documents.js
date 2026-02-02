import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useAuth, getAuthHeaders } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config';
const Documents = () => {
    const [documents, setDocuments] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    useAuth();
    useEffect(() => {
        fetchDocuments();
    }, []);
    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/documents`, {
                headers: getAuthHeaders(),
            });
            if (!response.ok)
                throw new Error('Erreur lors du chargement des documents');
            const data = await response.json();
            setDocuments(data.documents || []);
            setError('');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        }
        finally {
            setLoading(false);
        }
    };
    const selectedDocument = documents.find(d => d.id === selectedDoc);
    const filteredDocuments = documents.filter(doc => doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.type.toLowerCase().includes(searchQuery.toLowerCase()));
    const getClearanceColor = (level) => {
        const colors = {
            1: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399' },
            2: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa' },
            3: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24' },
            4: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171' },
            5: { bg: 'rgba(139, 92, 246, 0.15)', text: '#a78bfa' }
        };
        return colors[level] || colors[1];
    };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '24px' }, children: [_jsx("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: _jsxs("p", { style: { fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: 0 }, children: [documents.length, " documents disponibles"] }) }), error && (_jsx("div", { style: {
                    padding: '12px 16px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '10px',
                    fontSize: '13px',
                    color: '#f87171'
                }, children: error })), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }, children: [_jsxs("div", { style: {
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '12px',
                            overflow: 'hidden'
                        }, children: [_jsx("div", { style: { padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }, children: _jsx("input", { type: "text", placeholder: "Rechercher un document...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), style: {
                                        width: '100%',
                                        padding: '10px 14px',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        color: '#fff',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    } }) }), _jsx("div", { style: { maxHeight: '500px', overflowY: 'auto' }, children: loading ? (_jsx("div", { style: { padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }, children: "Chargement..." })) : filteredDocuments.length === 0 ? (_jsx("div", { style: { padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }, children: "Aucun document" })) : (filteredDocuments.map((doc) => (_jsxs("div", { onClick: () => setSelectedDoc(doc.id), style: {
                                        padding: '14px 16px',
                                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                                        cursor: 'pointer',
                                        background: selectedDoc === doc.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                        transition: 'background 0.15s ease'
                                    }, onMouseEnter: (e) => {
                                        if (selectedDoc !== doc.id)
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                    }, onMouseLeave: (e) => {
                                        if (selectedDoc !== doc.id)
                                            e.currentTarget.style.background = 'transparent';
                                    }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }, children: [_jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: {
                                                                fontSize: '13px',
                                                                fontWeight: 500,
                                                                color: '#fff',
                                                                marginBottom: '4px'
                                                            }, children: doc.title }), _jsx("div", { style: {
                                                                fontSize: '12px',
                                                                color: 'rgba(255,255,255,0.4)'
                                                            }, children: doc.type })] }), _jsxs("div", { style: {
                                                        fontSize: '10px',
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        fontWeight: 500,
                                                        ...getClearanceColor(doc.clearance),
                                                        background: getClearanceColor(doc.clearance).bg,
                                                        color: getClearanceColor(doc.clearance).text
                                                    }, children: ["CL-", doc.clearance] })] }), _jsx("div", { style: {
                                                fontSize: '11px',
                                                color: 'rgba(255,255,255,0.3)',
                                                marginTop: '8px'
                                            }, children: new Date(doc.created_at).toLocaleDateString('fr-FR') })] }, doc.id)))) })] }), _jsx("div", { style: {
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '12px',
                            overflow: 'hidden'
                        }, children: selectedDocument ? (_jsxs(_Fragment, { children: [_jsx("div", { style: {
                                        padding: '24px',
                                        borderBottom: '1px solid rgba(255,255,255,0.06)'
                                    }, children: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }, children: [_jsxs("div", { children: [_jsx("h3", { style: {
                                                            fontSize: '18px',
                                                            fontWeight: 600,
                                                            color: '#fff',
                                                            margin: 0
                                                        }, children: selectedDocument.title }), _jsxs("p", { style: {
                                                            fontSize: '13px',
                                                            color: 'rgba(255,255,255,0.4)',
                                                            margin: '8px 0 0'
                                                        }, children: [selectedDocument.type, " \u2022 ", new Date(selectedDocument.created_at).toLocaleDateString('fr-FR')] })] }), _jsxs("div", { style: {
                                                    padding: '6px 12px',
                                                    borderRadius: '20px',
                                                    fontSize: '12px',
                                                    fontWeight: 500,
                                                    background: getClearanceColor(selectedDocument.clearance).bg,
                                                    color: getClearanceColor(selectedDocument.clearance).text
                                                }, children: ["Clearance ", selectedDocument.clearance] })] }) }), _jsxs("div", { style: { padding: '24px' }, children: [_jsx("label", { style: { display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }, children: "Contenu" }), _jsx("div", { style: {
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
                                            }, children: selectedDocument.body })] })] })) : (_jsxs("div", { style: {
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '400px',
                                color: 'rgba(255,255,255,0.3)'
                            }, children: [_jsx("div", { style: { fontSize: '48px', marginBottom: '16px', opacity: 0.3 }, children: "\u25CE" }), _jsx("p", { style: { fontSize: '14px' }, children: "S\u00E9lectionnez un document" })] })) })] })] }));
};
export default Documents;
