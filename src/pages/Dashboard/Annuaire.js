import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useAuth, getAuthHeaders } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config';
const Annuaire = () => {
    const [personnel, setPersonnel] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('all');
    const [selectedPerson, setSelectedPerson] = useState(null);
    useAuth();
    useEffect(() => {
        fetchPersonnel();
    }, []);
    const fetchPersonnel = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/annuaire`, {
                headers: getAuthHeaders(),
            });
            if (!response.ok)
                throw new Error('Erreur lors du chargement de l\'annuaire');
            const data = await response.json();
            setPersonnel(data);
            setError('');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        }
        finally {
            setLoading(false);
        }
    };
    const departments = ['all', ...Array.from(new Set(personnel.map(p => p.department).filter(Boolean)))];
    const filteredPersonnel = personnel.filter(person => {
        if (person.suspended)
            return false;
        const matchesSearch = person.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            person.department?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = filterDepartment === 'all' || person.department === filterDepartment;
        return matchesSearch && matchesDept;
    });
    const getRoleLabel = (role) => {
        const labels = {
            'admin': 'Administrateur',
            'staff': 'Staff',
            'scientifique': 'Scientifique',
            'securite': 'Sécurité',
            'personnel': 'Personnel'
        };
        return labels[role] || role;
    };
    const getClearanceColor = (level) => {
        const colors = {
            1: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399' },
            2: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa' },
            3: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24' },
            4: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171' },
            5: { bg: 'rgba(139, 92, 246, 0.15)', text: '#a78bfa' },
            6: { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6' }
        };
        return colors[level] || colors[1];
    };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '24px' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }, children: [_jsxs("p", { style: { fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: 0 }, children: [filteredPersonnel.length, " membre", filteredPersonnel.length > 1 ? 's' : '', " trouv\u00E9", filteredPersonnel.length > 1 ? 's' : ''] }), _jsx("div", { style: { display: 'flex', gap: '12px' }, children: _jsxs("select", { value: filterDepartment, onChange: (e) => setFilterDepartment(e.target.value), style: {
                                padding: '10px 14px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '8px',
                                fontSize: '13px',
                                color: '#fff',
                                cursor: 'pointer',
                                outline: 'none'
                            }, children: [_jsx("option", { value: "all", children: "Tous les d\u00E9partements" }), departments.filter(d => d !== 'all').map(dept => (_jsx("option", { value: dept, children: dept }, dept)))] }) })] }), error && (_jsx("div", { style: {
                    padding: '12px 16px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '10px',
                    fontSize: '13px',
                    color: '#f87171'
                }, children: error })), _jsx("div", { style: {
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '12px',
                    padding: '16px'
                }, children: _jsx("input", { type: "text", placeholder: "Rechercher par nom ou d\u00E9partement...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), style: {
                        width: '100%',
                        padding: '12px 16px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        color: '#fff',
                        outline: 'none',
                        boxSizing: 'border-box'
                    } }) }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: selectedPerson ? '2fr 1fr' : '1fr', gap: '24px' }, children: [_jsx("div", { style: {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '16px'
                        }, children: loading ? (_jsx("div", { style: { gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }, children: "Chargement..." })) : filteredPersonnel.length === 0 ? (_jsx("div", { style: { gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }, children: "Aucun r\u00E9sultat" })) : (filteredPersonnel.map((person) => (_jsx("div", { onClick: () => setSelectedPerson(person), style: {
                                background: selectedPerson?.id === person.id ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)',
                                border: selectedPerson?.id === person.id ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.06)',
                                borderRadius: '12px',
                                padding: '20px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }, onMouseEnter: (e) => {
                                if (selectedPerson?.id !== person.id) {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                }
                            }, onMouseLeave: (e) => {
                                if (selectedPerson?.id !== person.id) {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                                }
                            }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '14px' }, children: [_jsx("div", { style: {
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
                                        }, children: person.username.charAt(0).toUpperCase() }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: {
                                                    fontSize: '14px',
                                                    fontWeight: 500,
                                                    color: '#fff',
                                                    marginBottom: '4px',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }, children: person.username }), _jsx("div", { style: {
                                                    fontSize: '12px',
                                                    color: 'rgba(255,255,255,0.4)'
                                                }, children: person.department || 'Sans département' })] }), _jsxs("div", { style: {
                                            fontSize: '11px',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontWeight: 500,
                                            background: getClearanceColor(person.clearance).bg,
                                            color: getClearanceColor(person.clearance).text
                                        }, children: ["CL-", person.clearance] })] }) }, person.id)))) }), selectedPerson && (_jsxs("div", { style: {
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            position: 'sticky',
                            top: '24px',
                            alignSelf: 'start'
                        }, children: [_jsxs("div", { style: {
                                    padding: '24px',
                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                    textAlign: 'center'
                                }, children: [_jsx("button", { onClick: () => setSelectedPerson(null), style: {
                                            position: 'absolute',
                                            top: '12px',
                                            right: '12px',
                                            background: 'none',
                                            border: 'none',
                                            color: 'rgba(255,255,255,0.4)',
                                            fontSize: '18px',
                                            cursor: 'pointer'
                                        }, children: "\u00D7" }), _jsx("div", { style: {
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
                                        }, children: selectedPerson.username.charAt(0).toUpperCase() }), _jsx("h3", { style: { fontSize: '18px', fontWeight: 600, color: '#fff', margin: '0 0 8px' }, children: selectedPerson.username }), _jsx("p", { style: { fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0 }, children: getRoleLabel(selectedPerson.role) })] }), _jsx("div", { style: { padding: '20px' }, children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '16px' }, children: [_jsxs("div", { style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                padding: '12px 0',
                                                borderBottom: '1px solid rgba(255,255,255,0.06)'
                                            }, children: [_jsx("span", { style: { fontSize: '13px', color: 'rgba(255,255,255,0.5)' }, children: "D\u00E9partement" }), _jsx("span", { style: { fontSize: '13px', color: '#fff', fontWeight: 500 }, children: selectedPerson.department || '—' })] }), _jsxs("div", { style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                padding: '12px 0',
                                                borderBottom: '1px solid rgba(255,255,255,0.06)'
                                            }, children: [_jsx("span", { style: { fontSize: '13px', color: 'rgba(255,255,255,0.5)' }, children: "Clearance" }), _jsxs("span", { style: {
                                                        fontSize: '12px',
                                                        padding: '4px 10px',
                                                        borderRadius: '6px',
                                                        fontWeight: 500,
                                                        background: getClearanceColor(selectedPerson.clearance).bg,
                                                        color: getClearanceColor(selectedPerson.clearance).text
                                                    }, children: ["Niveau ", selectedPerson.clearance] })] }), _jsxs("div", { style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                padding: '12px 0'
                                            }, children: [_jsx("span", { style: { fontSize: '13px', color: 'rgba(255,255,255,0.5)' }, children: "R\u00F4le" }), _jsx("span", { style: { fontSize: '13px', color: '#fff', fontWeight: 500 }, children: getRoleLabel(selectedPerson.role) })] })] }) })] }))] })] }));
};
export default Annuaire;
