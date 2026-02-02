import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useAuth, getAuthHeaders } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config';
const Staff = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [limit, setLimit] = useState(50);
    useAuth();
    useEffect(() => {
        fetchLogs();
    }, [limit]);
    const fetchLogs = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/logs?limit=${limit}&offset=0`, {
                headers: getAuthHeaders(),
            });
            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('Accès refusé - logs réservés au Staff');
                }
                throw new Error('Erreur lors du chargement des logs');
            }
            const data = await response.json();
            setLogs(data.logs || []);
            setError('');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        }
        finally {
            setLoading(false);
        }
    };
    if (loading) {
        return (_jsx("div", { className: "bg-white rounded-lg shadow p-6 text-center text-foundation-600", children: "Chargement des logs..." }));
    }
    return (_jsxs("div", { className: "bg-white rounded-lg shadow p-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsx("h2", { className: "text-xl font-bold text-foundation-900", children: "Supervision - Logs Syst\u00E8me" }), _jsxs("select", { value: limit, onChange: (e) => setLimit(parseInt(e.target.value)), className: "px-3 py-1 border border-foundation-300 rounded-lg text-sm", children: [_jsx("option", { value: 10, children: "10" }), _jsx("option", { value: 50, children: "50" }), _jsx("option", { value: 100, children: "100" }), _jsx("option", { value: 500, children: "500" })] })] }), error && (_jsxs("div", { className: "bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm", children: ["\u274C ", error] })), logs.length === 0 ? (_jsx("p", { className: "text-foundation-600 text-center py-8", children: "Aucun log" })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-foundation-200", children: [_jsx("th", { className: "text-left py-3 px-4 font-semibold text-foundation-900", children: "Action" }), _jsx("th", { className: "text-left py-3 px-4 font-semibold text-foundation-900", children: "Utilisateur" }), _jsx("th", { className: "text-left py-3 px-4 font-semibold text-foundation-900", children: "D\u00E9tails" }), _jsx("th", { className: "text-left py-3 px-4 font-semibold text-foundation-900", children: "IP" }), _jsx("th", { className: "text-left py-3 px-4 font-semibold text-foundation-900", children: "Timestamp" })] }) }), _jsx("tbody", { children: logs.map((log) => (_jsxs("tr", { className: "border-b border-foundation-100 hover:bg-foundation-50", children: [_jsx("td", { className: "py-3 px-4", children: _jsx("span", { className: "bg-foundation-100 text-foundation-800 px-2 py-1 rounded text-xs font-medium", children: log.action }) }), _jsx("td", { className: "py-3 px-4 text-foundation-900 font-medium", children: log.user?.username || `User #${log.user_id}` }), _jsx("td", { className: "py-3 px-4 text-foundation-600 max-w-xs truncate", children: log.details || '—' }), _jsx("td", { className: "py-3 px-4 text-foundation-500 text-xs font-mono", children: log.ip_address }), _jsx("td", { className: "py-3 px-4 text-foundation-500 text-xs whitespace-nowrap", children: new Date(log.created_at).toLocaleString('fr-FR') })] }, log.id))) })] }) })), _jsxs("p", { className: "text-xs text-foundation-500 mt-4", children: ["Total: ", logs.length, " log(s) \u2022 API: localhost:3000"] })] }));
};
export default Staff;
