import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useAuth, getAuthHeaders } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config';
// Styled input component
const Input = ({ value, onChange, placeholder, type = 'text' }) => (_jsx("input", { type: type, value: value, onChange: onChange, placeholder: placeholder, style: {
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
    }, onFocus: (e) => e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)', onBlur: (e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)' }));
// Styled select component
const Select = ({ value, onChange, children }) => (_jsx("select", { value: value, onChange: onChange, style: {
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
    }, children: children }));
const RH = () => {
    const { user } = useAuth();
    const [personnel, setPersonnel] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [newNote, setNewNote] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [tempPassword, setTempPassword] = useState(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [logs, setLogs] = useState([]);
    const [newUser, setNewUser] = useState({
        username: '',
        role: '',
        clearance: 1,
        department: ''
    });
    useEffect(() => {
        fetchPersonnel();
    }, []);
    useEffect(() => {
        if (selectedUser) {
            fetchNotes(selectedUser.id);
        }
    }, [selectedUser]);
    const fetchPersonnel = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/rh/users`, {
                headers: getAuthHeaders(),
            });
            if (!response.ok)
                throw new Error('Erreur lors du chargement du personnel');
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
    const fetchNotes = async (userId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/rh/notes/${userId}`, {
                headers: getAuthHeaders(),
            });
            if (response.ok) {
                const data = await response.json();
                setNotes(data || []);
            }
        }
        catch (err) {
            console.error('Erreur:', err);
        }
    };
    const addNote = async () => {
        if (!selectedUser || !newNote.trim())
            return;
        try {
            const response = await fetch(`${API_BASE_URL}/rh/notes/${selectedUser.id}`, {
                method: 'POST',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newNote })
            });
            if (response.ok) {
                setNewNote('');
                fetchNotes(selectedUser.id);
            }
        }
        catch (err) {
            console.error('Erreur:', err);
        }
    };
    const updateClearance = async (level) => {
        if (!selectedUser)
            return;
        try {
            const response = await fetch(`${API_BASE_URL}/rh/clearance/${selectedUser.id}`, {
                method: 'PATCH',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ clearance: level })
            });
            if (response.ok) {
                const updated = { ...selectedUser, clearance: level };
                setSelectedUser(updated);
                setPersonnel(personnel.map(u => u.id === selectedUser.id ? updated : u));
            }
        }
        catch (err) {
            console.error('Erreur:', err);
        }
    };
    const toggleSuspend = async () => {
        if (!selectedUser)
            return;
        try {
            const response = await fetch(`${API_BASE_URL}/rh/suspend/${selectedUser.id}`, {
                method: 'PATCH',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ suspended: !selectedUser.suspended })
            });
            if (response.ok) {
                const updated = { ...selectedUser, suspended: !selectedUser.suspended };
                setSelectedUser(updated);
                setPersonnel(personnel.map(u => u.id === selectedUser.id ? updated : u));
            }
        }
        catch (err) {
            console.error('Erreur:', err);
        }
    };
    const deleteUser = async () => {
        if (!selectedUser)
            return;
        if (!window.confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${selectedUser.username}" ? Cette action est irréversible.`)) {
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/rh/users/${selectedUser.id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            if (response.ok) {
                setPersonnel(personnel.filter(u => u.id !== selectedUser.id));
                setSelectedUser(null);
            }
            else {
                alert('Erreur lors de la suppression');
            }
        }
        catch (err) {
            console.error('Erreur:', err);
            alert('Erreur lors de la suppression');
        }
    };
    const changeRole = async (newRole) => {
        if (!selectedUser)
            return;
        try {
            const response = await fetch(`${API_BASE_URL}/rh/role/${selectedUser.id}`, {
                method: 'PATCH',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });
            if (response.ok) {
                const updated = { ...selectedUser, role: newRole };
                setSelectedUser(updated);
                setPersonnel(personnel.map(u => u.id === selectedUser.id ? updated : u));
            }
            else {
                alert('Erreur lors du changement de rôle');
            }
        }
        catch (err) {
            console.error('Erreur:', err);
            alert('Erreur lors du changement de rôle');
        }
    };
    const handleCreateUser = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/rh/users`, {
                method: 'POST',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });
            if (response.ok) {
                const createdUser = await response.json();
                setPersonnel([...personnel, createdUser]);
                setTempPassword(createdUser.temporaryPassword || null);
                setShowPasswordModal(true);
                setNewUser({ username: '', role: '', clearance: 1, department: '' });
                setShowCreateForm(false);
                setError('');
            }
            else {
                const err = await response.json();
                setError(err.message || 'Erreur lors de la création');
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        }
    };
    const resetPassword = async () => {
        if (!selectedUser)
            return;
        if (!window.confirm(`Êtes-vous sûr de vouloir réinitialiser le mot de passe de "${selectedUser.username}" ?`)) {
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/rh/reset-password/${selectedUser.id}`, {
                method: 'POST',
                headers: getAuthHeaders(),
            });
            if (response.ok) {
                const data = await response.json();
                setTempPassword(data.temporaryPassword);
                setShowPasswordModal(true);
            }
            else {
                alert('Erreur lors de la réinitialisation');
            }
        }
        catch (err) {
            console.error('Erreur:', err);
            alert('Erreur lors de la réinitialisation');
        }
    };
    const fetchLogs = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/logs`, {
                headers: getAuthHeaders(),
            });
            if (response.ok) {
                const data = await response.json();
                setLogs(data || []);
                setShowLogsModal(true);
            }
        }
        catch (err) {
            console.error('Erreur:', err);
            alert('Erreur lors du chargement des logs');
        }
    };
    const filteredPersonnel = personnel.filter(user => user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.department.toLowerCase().includes(searchQuery.toLowerCase()));
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '24px' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("div", { children: _jsxs("p", { style: { fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: 0 }, children: [personnel.length, " membres du personnel"] }) }), _jsx("button", { onClick: () => setShowCreateForm(!showCreateForm), style: {
                            padding: '10px 16px',
                            background: showCreateForm ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: '#fff',
                            cursor: 'pointer',
                            transition: 'opacity 0.15s ease'
                        }, children: showCreateForm ? 'Annuler' : '+ Nouveau membre' })] }), error && (_jsx("div", { style: {
                    padding: '12px 16px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '10px',
                    fontSize: '13px',
                    color: '#f87171'
                }, children: error })), showCreateForm && (_jsxs("div", { style: {
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '12px',
                    padding: '24px'
                }, children: [_jsx("h3", { style: { fontSize: '16px', fontWeight: 600, color: '#fff', margin: '0 0 20px' }, children: "Cr\u00E9er un nouveau membre" }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }, children: [_jsxs("div", { children: [_jsx("label", { style: { display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }, children: "Identifiant" }), _jsx(Input, { value: newUser.username, onChange: (e) => setNewUser({ ...newUser, username: e.target.value }), placeholder: "email@fondation.scp" })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }, children: "D\u00E9partement" }), _jsx(Input, { value: newUser.department, onChange: (e) => setNewUser({ ...newUser, department: e.target.value }), placeholder: "D\u00E9partement" })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }, children: "R\u00F4le (personnalis\u00E9)" }), _jsx(Input, { value: newUser.role, onChange: (e) => setNewUser({ ...newUser, role: e.target.value }), placeholder: "Ex: scientifique, admin, securite..." }), _jsx("div", { style: { fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }, children: "Exemples: scientifique, securite, administration, direction, staff, admin, ia" })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }, children: "Niveau Clearance" }), _jsxs(Select, { value: newUser.clearance, onChange: (e) => setNewUser({ ...newUser, clearance: parseInt(e.target.value) }), children: [_jsx("option", { value: "1", children: "Niveau 1" }), _jsx("option", { value: "2", children: "Niveau 2" }), _jsx("option", { value: "3", children: "Niveau 3" }), _jsx("option", { value: "4", children: "Niveau 4" }), _jsx("option", { value: "5", children: "Niveau 5" })] })] }), _jsx("div", { style: { gridColumn: '1 / -1' }, children: _jsx("button", { onClick: handleCreateUser, style: {
                                        width: '100%',
                                        padding: '10px',
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        color: '#fff',
                                        cursor: 'pointer'
                                    }, children: "Cr\u00E9er le membre" }) })] })] })), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }, children: [_jsxs("div", { style: {
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '12px',
                            overflow: 'hidden'
                        }, children: [_jsx("div", { style: { padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }, children: _jsx("input", { type: "text", placeholder: "Rechercher...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), style: {
                                        width: '100%',
                                        padding: '10px 14px',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        color: '#fff',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    } }) }), _jsx("div", { style: { maxHeight: '500px', overflowY: 'auto' }, children: loading ? (_jsx("div", { style: { padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }, children: "Chargement..." })) : filteredPersonnel.length === 0 ? (_jsx("div", { style: { padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }, children: "Aucun r\u00E9sultat" })) : (filteredPersonnel.map((user) => (_jsx("div", { onClick: () => setSelectedUser(user), style: {
                                        padding: '14px 16px',
                                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                                        cursor: 'pointer',
                                        background: selectedUser?.id === user.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                        transition: 'background 0.15s ease'
                                    }, onMouseEnter: (e) => {
                                        if (selectedUser?.id !== user.id)
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                    }, onMouseLeave: (e) => {
                                        if (selectedUser?.id !== user.id)
                                            e.currentTarget.style.background = 'transparent';
                                    }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsx("div", { style: {
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
                                                }, children: user.username.charAt(0).toUpperCase() }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: {
                                                            fontSize: '13px',
                                                            fontWeight: 500,
                                                            color: user.suspended ? 'rgba(255,255,255,0.4)' : '#fff',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            textDecoration: user.suspended ? 'line-through' : 'none'
                                                        }, children: user.username }), _jsx("div", { style: {
                                                            fontSize: '12px',
                                                            color: 'rgba(255,255,255,0.4)',
                                                            marginTop: '2px'
                                                        }, children: user.department || 'Sans département' })] }), _jsxs("div", { style: {
                                                    fontSize: '11px',
                                                    padding: '4px 8px',
                                                    borderRadius: '6px',
                                                    background: 'rgba(59, 130, 246, 0.1)',
                                                    color: '#60a5fa'
                                                }, children: ["Niv. ", user.clearance] })] }) }, user.id)))) })] }), _jsx("div", { style: {
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '12px',
                            overflow: 'hidden'
                        }, children: selectedUser ? (_jsxs(_Fragment, { children: [_jsxs("div", { style: {
                                        padding: '24px',
                                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start'
                                    }, children: [_jsxs("div", { style: { display: 'flex', gap: '16px', alignItems: 'center' }, children: [_jsx("div", { style: {
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
                                                    }, children: selectedUser.username.charAt(0).toUpperCase() }), _jsxs("div", { children: [_jsx("h3", { style: {
                                                                fontSize: '18px',
                                                                fontWeight: 600,
                                                                color: '#fff',
                                                                margin: 0
                                                            }, children: selectedUser.username }), _jsxs("p", { style: {
                                                                fontSize: '13px',
                                                                color: 'rgba(255,255,255,0.4)',
                                                                margin: '4px 0 0'
                                                            }, children: [selectedUser.department || 'Sans département', " \u2022 ", selectedUser.role] })] })] }), _jsx("div", { style: {
                                                padding: '6px 12px',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                                background: selectedUser.suspended ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                                color: selectedUser.suspended ? '#f87171' : '#34d399'
                                            }, children: selectedUser.suspended ? '● Suspendu' : '● Actif' })] }), _jsxs("div", { style: {
                                        padding: '24px',
                                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(2, 1fr)',
                                        gap: '24px'
                                    }, children: [_jsxs("div", { children: [_jsx("label", { style: { display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }, children: "Niveau de clearance" }), _jsx("div", { style: { display: 'flex', gap: '8px' }, children: [1, 2, 3, 4, 5].map(level => (_jsx("button", { onClick: () => updateClearance(level), style: {
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
                                                        }, children: level }, level))) })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }, children: "Statut du compte" }), _jsx("button", { onClick: toggleSuspend, style: {
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
                                                    }, children: selectedUser.suspended ? 'Réactiver le compte' : 'Suspendre le compte' })] })] }), user?.role === 'admin' && (_jsxs("div", { style: {
                                        padding: '24px',
                                        borderTop: '1px solid rgba(255,255,255,0.06)',
                                        borderBottom: '1px solid rgba(255,255,255,0.06)'
                                    }, children: [_jsx("label", { style: { display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }, children: "Modifier le r\u00F4le" }), _jsxs("div", { style: { display: 'flex', gap: '8px' }, children: [_jsx("input", { type: "text", value: selectedUser.role, onChange: (e) => setSelectedUser({ ...selectedUser, role: e.target.value }), placeholder: "Nouveau r\u00F4le...", style: {
                                                        flex: 1,
                                                        padding: '10px 14px',
                                                        background: 'rgba(255,255,255,0.03)',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        borderRadius: '8px',
                                                        fontSize: '13px',
                                                        color: '#fff',
                                                        outline: 'none'
                                                    } }), _jsx("button", { onClick: () => changeRole(selectedUser.role), style: {
                                                        padding: '10px 16px',
                                                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontSize: '13px',
                                                        fontWeight: 600,
                                                        color: '#fff',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease'
                                                    }, onMouseEnter: (e) => e.currentTarget.style.opacity = '0.8', onMouseLeave: (e) => e.currentTarget.style.opacity = '1', children: "Confirmer" })] })] })), user?.role === 'admin' && (_jsx("div", { style: {
                                        padding: '24px',
                                        borderTop: '1px solid rgba(255,255,255,0.06)',
                                        borderBottom: '1px solid rgba(255,255,255,0.06)'
                                    }, children: _jsx("button", { onClick: deleteUser, style: {
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
                                        }, onMouseEnter: (e) => {
                                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
                                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.7)';
                                        }, onMouseLeave: (e) => {
                                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                                        }, children: "\uD83D\uDDD1\uFE0F Supprimer cet utilisateur" }) })), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }, children: [_jsx("button", { onClick: resetPassword, style: {
                                                padding: '10px 16px',
                                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                                color: '#fff',
                                                cursor: 'pointer'
                                            }, children: "\uD83D\uDD10 R\u00E9initialiser mot de passe" }), user?.role === 'admin' && (_jsx("button", { onClick: fetchLogs, style: {
                                                padding: '10px 16px',
                                                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                                color: '#fff',
                                                cursor: 'pointer'
                                            }, children: "\uD83D\uDCCB Voir les logs" }))] }), _jsxs("div", { style: { padding: '24px' }, children: [_jsxs("label", { style: { display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }, children: ["Notes RH (", notes.length, ")"] }), _jsx("div", { style: {
                                                maxHeight: '200px',
                                                overflowY: 'auto',
                                                marginBottom: '16px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px'
                                            }, children: notes.length === 0 ? (_jsx("div", { style: {
                                                    padding: '20px',
                                                    textAlign: 'center',
                                                    color: 'rgba(255,255,255,0.3)',
                                                    background: 'rgba(255,255,255,0.02)',
                                                    borderRadius: '8px'
                                                }, children: "Aucune note" })) : (notes.map(note => (_jsxs("div", { style: {
                                                    padding: '12px 14px',
                                                    background: 'rgba(255,255,255,0.02)',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(255,255,255,0.04)'
                                                }, children: [_jsx("p", { style: { fontSize: '13px', color: 'rgba(255,255,255,0.8)', margin: 0 }, children: note.content }), _jsx("span", { style: { fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '6px', display: 'block' }, children: new Date(note.created_at).toLocaleDateString('fr-FR') })] }, note.id)))) }), _jsxs("div", { style: { display: 'flex', gap: '8px' }, children: [_jsx("input", { type: "text", placeholder: "Ajouter une note...", value: newNote, onChange: (e) => setNewNote(e.target.value), onKeyPress: (e) => e.key === 'Enter' && addNote(), style: {
                                                        flex: 1,
                                                        padding: '10px 14px',
                                                        background: 'rgba(255,255,255,0.03)',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        borderRadius: '8px',
                                                        fontSize: '13px',
                                                        color: '#fff',
                                                        outline: 'none'
                                                    } }), _jsx("button", { onClick: addNote, style: {
                                                        padding: '10px 20px',
                                                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontSize: '13px',
                                                        fontWeight: 500,
                                                        color: '#fff',
                                                        cursor: 'pointer'
                                                    }, children: "Ajouter" })] })] })] })) : (_jsxs("div", { style: {
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '400px',
                                color: 'rgba(255,255,255,0.3)'
                            }, children: [_jsx("div", { style: { fontSize: '48px', marginBottom: '16px', opacity: 0.3 }, children: "\u25C7" }), _jsx("p", { style: { fontSize: '14px' }, children: "S\u00E9lectionnez un membre du personnel" })] })) })] }), showPasswordModal && tempPassword && (_jsx("div", { style: {
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
                }, children: _jsxs("div", { style: {
                        background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(20,34,74,0.95) 100%)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '16px',
                        padding: '32px',
                        maxWidth: '400px',
                        textAlign: 'center'
                    }, children: [_jsx("h2", { style: { fontSize: '20px', fontWeight: 600, color: '#fff', margin: '0 0 16px' }, children: "\u2713 Utilisateur cr\u00E9\u00E9" }), _jsx("p", { style: { fontSize: '14px', color: 'rgba(255,255,255,0.7)', margin: '0 0 24px' }, children: "Mot de passe temporaire g\u00E9n\u00E9r\u00E9 automatiquement :" }), _jsx("div", { style: {
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
                            }, children: tempPassword }), _jsx("p", { style: { fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '0 0 24px' }, children: "\u26A0\uFE0F Ce mot de passe a \u00E9galement \u00E9t\u00E9 post\u00E9 sur Discord" }), _jsx("button", { onClick: () => {
                                navigator.clipboard.writeText(tempPassword);
                                alert('Mot de passe copié');
                            }, style: {
                                padding: '10px 20px',
                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: 500,
                                color: '#fff',
                                cursor: 'pointer',
                                marginRight: '12px'
                            }, children: "\uD83D\uDCCB Copier" }), _jsx("button", { onClick: () => setShowPasswordModal(false), style: {
                                padding: '10px 20px',
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: 500,
                                color: '#fff',
                                cursor: 'pointer'
                            }, children: "Fermer" })] }) })), showLogsModal && (_jsx("div", { style: {
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
                }, children: _jsxs("div", { style: {
                        background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(20,34,74,0.95) 100%)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '16px',
                        padding: '32px',
                        maxWidth: '800px',
                        maxHeight: '600px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }, children: [_jsx("h2", { style: { fontSize: '20px', fontWeight: 600, color: '#fff', margin: 0 }, children: "\uD83D\uDCCB Journal des actions (50 derni\u00E8res)" }), _jsx("div", { style: {
                                overflowY: 'auto',
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }, children: logs.length === 0 ? (_jsx("p", { style: { color: 'rgba(255,255,255,0.5)' }, children: "Aucun log" })) : (logs.map((log, idx) => (_jsxs("div", { style: {
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    fontSize: '12px',
                                    fontFamily: 'monospace'
                                }, children: [_jsxs("div", { style: { color: '#3b82f6', fontWeight: 600 }, children: ["[", new Date(log.created_at).toLocaleString(), "] ", _jsx("span", { style: { color: '#10b981' }, children: log.action })] }), _jsxs("div", { style: { color: 'rgba(255,255,255,0.6)', marginTop: '4px' }, children: ["Par: ", log.username || 'Système', " | D\u00E9tails: ", log.details || 'N/A'] })] }, idx)))) }), _jsx("button", { onClick: () => setShowLogsModal(false), style: {
                                padding: '10px 20px',
                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: 500,
                                color: '#fff',
                                cursor: 'pointer'
                            }, children: "Fermer" })] }) }))] }));
};
export default RH;
