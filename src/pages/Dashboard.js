import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Documents from './Dashboard/Documents';
import Mail from './Dashboard/Mail';
import RH from './Dashboard/RH';
import Staff from './Dashboard/Staff';
import Annuaire from './Dashboard/Annuaire';
import Modules from './Dashboard/Modules';
const MENU_ITEMS = [
    { id: 'overview', label: 'Tableau de bord', icon: '◉' },
    { id: 'documents', label: 'Documents', icon: '◎' },
    { id: 'mail', label: 'Messagerie', icon: '◈' },
    { id: 'annuaire', label: 'Annuaire', icon: '◍' },
    { id: 'rh', label: 'Ressources Humaines', icon: '◇', admin: true },
    { id: 'modules', label: 'Modules', icon: '⚙', admin: true },
    { id: 'staff', label: 'Supervision', icon: '◆', staff: true },
];
// Stats card component
const StatCard = ({ label, value, accent = '#3b82f6' }) => (_jsxs("div", { style: {
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    }, children: [_jsx("span", { style: { fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }, children: label }), _jsx("span", { style: { fontSize: '28px', fontWeight: 600, color: accent }, children: value })] }));
// Overview component
const Overview = ({ user }) => (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '32px' }, children: [_jsxs("div", { children: [_jsxs("h2", { style: { fontSize: '24px', fontWeight: 600, color: '#fff', marginBottom: '8px' }, children: ["Bienvenue, ", user.username] }), _jsx("p", { style: { fontSize: '14px', color: 'rgba(255,255,255,0.5)' }, children: "Voici un aper\u00E7u de votre activit\u00E9 sur l'intranet." })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }, children: [_jsx(StatCard, { label: "Clearance", value: `Niveau ${user.clearance}`, accent: "#10b981" }), _jsx(StatCard, { label: "D\u00E9partement", value: user.department || 'Non assigné', accent: "#8b5cf6" })] }), _jsxs("div", { style: {
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                padding: '24px'
            }, children: [_jsx("h3", { style: { fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '16px' }, children: "Informations du compte" }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }, children: [_jsx("span", { style: { color: 'rgba(255,255,255,0.5)', fontSize: '14px' }, children: "Identifiant" }), _jsx("span", { style: { color: '#fff', fontSize: '14px', fontWeight: 500 }, children: user.username })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }, children: [_jsx("span", { style: { color: 'rgba(255,255,255,0.5)', fontSize: '14px' }, children: "R\u00F4le" }), _jsx("span", { style: { color: '#fff', fontSize: '14px', fontWeight: 500, textTransform: 'capitalize' }, children: user.role })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }, children: [_jsx("span", { style: { color: 'rgba(255,255,255,0.5)', fontSize: '14px' }, children: "D\u00E9partement" }), _jsx("span", { style: { color: '#fff', fontSize: '14px', fontWeight: 500 }, children: user.department || '—' })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }, children: [_jsx("span", { style: { color: 'rgba(255,255,255,0.5)', fontSize: '14px' }, children: "Statut" }), _jsx("span", { style: { color: '#10b981', fontSize: '14px', fontWeight: 500 }, children: "\u25CF Actif" })] })] })] })] }));
export const Dashboard = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    if (!user)
        return null;
    const isAdmin = user.role === 'admin';
    const isStaff = user.role === 'staff' || isAdmin;
    const canAccessRH = isAdmin || ['administration', 'direction', 'staff'].includes(user.role);
    const visibleMenuItems = MENU_ITEMS.filter(item => {
        if (item.admin)
            return canAccessRH;
        if (item.staff)
            return isStaff;
        return true;
    });
    return (_jsxs("div", { style: {
            display: 'flex',
            minHeight: '100vh',
            background: '#0a0a0b',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }, children: [_jsxs("aside", { style: {
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
                }, children: [_jsx("div", { style: {
                            padding: '24px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)'
                        }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsx("div", { style: {
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
                                    }, children: "S" }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: '15px', fontWeight: 600, color: '#fff' }, children: "Fondation SCP" }), _jsx("div", { style: { fontSize: '12px', color: 'rgba(255,255,255,0.4)' }, children: "Intranet" })] })] }) }), _jsxs("nav", { style: { padding: '16px 12px', flex: 1 }, children: [_jsx("div", { style: { marginBottom: '8px', padding: '0 12px' }, children: _jsx("span", { style: { fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px' }, children: "Navigation" }) }), visibleMenuItems.map((item) => (_jsxs("button", { onClick: () => setActiveTab(item.id), style: {
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
                                }, onMouseEnter: (e) => {
                                    if (activeTab !== item.id)
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                }, onMouseLeave: (e) => {
                                    if (activeTab !== item.id)
                                        e.currentTarget.style.background = 'transparent';
                                }, children: [_jsx("span", { style: {
                                            fontSize: '16px',
                                            color: activeTab === item.id ? '#3b82f6' : 'rgba(255,255,255,0.4)'
                                        }, children: item.icon }), _jsx("span", { style: {
                                            fontSize: '14px',
                                            fontWeight: activeTab === item.id ? 500 : 400,
                                            color: activeTab === item.id ? '#fff' : 'rgba(255,255,255,0.6)'
                                        }, children: item.label }), item.admin && (_jsx("span", { style: {
                                            marginLeft: 'auto',
                                            fontSize: '10px',
                                            padding: '2px 6px',
                                            background: 'rgba(139, 92, 246, 0.2)',
                                            color: '#a78bfa',
                                            borderRadius: '4px',
                                            fontWeight: 500
                                        }, children: "ADMIN" }))] }, item.id)))] }), _jsxs("div", { style: {
                            padding: '16px',
                            borderTop: '1px solid rgba(255,255,255,0.06)'
                        }, children: [_jsxs("div", { style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: '10px',
                                    marginBottom: '12px'
                                }, children: [_jsx("div", { style: {
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
                                        }, children: user.username.charAt(0).toUpperCase() }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontSize: '13px', fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, children: user.username }), _jsxs("div", { style: { fontSize: '12px', color: 'rgba(255,255,255,0.4)' }, children: ["Clearance ", user.clearance] })] })] }), _jsx("button", { onClick: logout, style: {
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
                                }, onMouseEnter: (e) => {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                                }, onMouseLeave: (e) => {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                }, children: "D\u00E9connexion" })] })] }), _jsxs("main", { style: {
                    flex: 1,
                    marginLeft: '260px',
                    display: 'flex',
                    flexDirection: 'column'
                }, children: [_jsxs("header", { style: {
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
                        }, children: [_jsx("div", { children: _jsx("h1", { style: { fontSize: '18px', fontWeight: 600, color: '#fff', margin: 0 }, children: MENU_ITEMS.find(m => m.id === activeTab)?.label }) }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '16px' }, children: [_jsx("span", { style: { fontSize: '13px', color: 'rgba(255,255,255,0.4)' }, children: time.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) }), _jsx("span", { style: { fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }, children: time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) })] })] }), _jsxs("div", { style: { flex: 1, padding: '32px', overflowY: 'auto' }, children: [activeTab === 'overview' && _jsx(Overview, { user: user }), activeTab === 'documents' && _jsx(Documents, {}), activeTab === 'mail' && _jsx(Mail, {}), activeTab === 'annuaire' && _jsx(Annuaire, {}), activeTab === 'rh' && canAccessRH && _jsx(RH, {}), activeTab === 'modules' && user.role === 'admin' && _jsx(Modules, {}), activeTab === 'staff' && isStaff && _jsx(Staff, {})] })] })] }));
};
