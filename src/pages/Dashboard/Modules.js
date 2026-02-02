import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useAuth, getAuthHeaders } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config';
const Modules = () => {
    const { user } = useAuth();
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        fetchModules();
    }, []);
    const fetchModules = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/modules`, {
                headers: getAuthHeaders(),
            });
            if (!response.ok)
                throw new Error('Erreur lors du chargement des modules');
            const data = await response.json();
            setModules(data || []);
            setError('');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        }
        finally {
            setLoading(false);
        }
    };
    const toggleModule = async (moduleName, currentState) => {
        if (user?.role !== 'admin') {
            alert('Seuls les administrateurs peuvent modifier les modules');
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/modules/${moduleName}`, {
                method: 'PATCH',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !currentState })
            });
            if (response.ok) {
                await fetchModules();
            }
            else {
                alert('Erreur lors de la modification du module');
            }
        }
        catch (err) {
            console.error('Erreur:', err);
            alert('Erreur lors de la modification');
        }
    };
    if (loading) {
        return _jsx("div", { style: { padding: '24px', color: 'rgba(255,255,255,0.5)' }, children: "Chargement..." });
    }
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '24px' }, children: [_jsxs("div", { children: [_jsx("h2", { style: { fontSize: '24px', fontWeight: 600, color: '#fff', margin: '0 0 8px' }, children: "\u2699\uFE0F Gestion des modules" }), _jsx("p", { style: { fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: 0 }, children: "Activez ou d\u00E9sactivez les modules de l'intranet" })] }), error && (_jsx("div", { style: {
                    padding: '12px 16px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '10px',
                    fontSize: '13px',
                    color: '#f87171'
                }, children: error })), _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }, children: modules.map((mod) => (_jsxs("div", { style: {
                        background: 'rgba(255,255,255,0.02)',
                        border: `1px solid ${mod.enabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        borderRadius: '12px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }, children: [_jsxs("div", { children: [_jsx("h3", { style: { fontSize: '16px', fontWeight: 600, color: '#fff', margin: 0 }, children: mod.name }), _jsx("p", { style: { fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0' }, children: mod.description })] }), _jsx("div", { style: {
                                        padding: '6px 12px',
                                        background: mod.enabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                        border: `1px solid ${mod.enabled ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        color: mod.enabled ? '#10b981' : '#ef4444'
                                    }, children: mod.enabled ? '✓ Activé' : '✕ Désactivé' })] }), user?.role === 'admin' && (_jsx("button", { onClick: () => toggleModule(mod.name, mod.enabled === 1), style: {
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
                            }, onMouseEnter: (e) => {
                                e.currentTarget.style.opacity = '0.8';
                            }, onMouseLeave: (e) => {
                                e.currentTarget.style.opacity = '1';
                            }, children: mod.enabled ? '🔴 Désactiver' : '🟢 Activer' }))] }, mod.id))) }), modules.length === 0 && (_jsx("div", { style: {
                    padding: '40px',
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.3)'
                }, children: "Aucun module disponible" }))] }));
};
export default Modules;
