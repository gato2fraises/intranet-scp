import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
export const Login = () => {
    const { login, loading, error } = useAuth();
    const [username, setUsername] = useState('administrateur@site.obsidian.fr');
    const [password, setPassword] = useState('Obsidian#SecureAdmin2024@Fr');
    const [localError, setLocalError] = useState('');
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');
        try {
            await login(username, password);
        }
        catch {
            setLocalError(error || 'Erreur d\'authentification');
        }
    };
    return (_jsxs("div", { style: {
            minHeight: '100vh',
            background: '#0a0a0b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }, children: [_jsx("div", { style: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'radial-gradient(ellipse at top, rgba(59, 130, 246, 0.08) 0%, transparent 50%)',
                    pointerEvents: 'none'
                } }), _jsxs("div", { style: { width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }, children: [_jsxs("div", { style: {
                            background: '#0f0f10',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '16px',
                            overflow: 'hidden'
                        }, children: [_jsxs("div", { style: {
                                    padding: '40px 32px 32px',
                                    textAlign: 'center',
                                    borderBottom: '1px solid rgba(255,255,255,0.06)'
                                }, children: [_jsx("div", { style: {
                                            width: '56px',
                                            height: '56px',
                                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                                            borderRadius: '14px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '24px',
                                            fontWeight: 700,
                                            color: '#fff',
                                            marginBottom: '20px'
                                        }, children: "S" }), _jsx("h1", { style: {
                                            fontSize: '22px',
                                            fontWeight: 600,
                                            color: '#fff',
                                            margin: '0 0 8px'
                                        }, children: "Fondation SCP" }), _jsx("p", { style: {
                                            fontSize: '14px',
                                            color: 'rgba(255,255,255,0.4)',
                                            margin: 0
                                        }, children: "Connectez-vous \u00E0 l'intranet" })] }), _jsxs("form", { onSubmit: handleSubmit, style: { padding: '32px' }, children: [_jsxs("div", { style: { marginBottom: '20px' }, children: [_jsx("label", { style: {
                                                    display: 'block',
                                                    fontSize: '13px',
                                                    fontWeight: 500,
                                                    color: 'rgba(255,255,255,0.6)',
                                                    marginBottom: '8px'
                                                }, children: "Identifiant" }), _jsx("input", { type: "text", value: username, onChange: (e) => setUsername(e.target.value), disabled: loading, style: {
                                                    width: '100%',
                                                    padding: '12px 16px',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: '10px',
                                                    fontSize: '14px',
                                                    color: '#fff',
                                                    outline: 'none',
                                                    transition: 'border-color 0.2s ease',
                                                    boxSizing: 'border-box'
                                                }, placeholder: "identifiant@fondation.scp", onFocus: (e) => e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)', onBlur: (e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)' })] }), _jsxs("div", { style: { marginBottom: '24px' }, children: [_jsx("label", { style: {
                                                    display: 'block',
                                                    fontSize: '13px',
                                                    fontWeight: 500,
                                                    color: 'rgba(255,255,255,0.6)',
                                                    marginBottom: '8px'
                                                }, children: "Mot de passe" }), _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), disabled: loading, style: {
                                                    width: '100%',
                                                    padding: '12px 16px',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: '10px',
                                                    fontSize: '14px',
                                                    color: '#fff',
                                                    outline: 'none',
                                                    transition: 'border-color 0.2s ease',
                                                    boxSizing: 'border-box'
                                                }, placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", onFocus: (e) => e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)', onBlur: (e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)' })] }), (error || localError) && (_jsx("div", { style: {
                                            padding: '12px 16px',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                            borderRadius: '10px',
                                            marginBottom: '20px',
                                            fontSize: '13px',
                                            color: '#f87171'
                                        }, children: error || localError })), _jsx("button", { type: "submit", disabled: loading, style: {
                                            width: '100%',
                                            padding: '12px',
                                            background: loading ? 'rgba(59, 130, 246, 0.5)' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            color: '#fff',
                                            cursor: loading ? 'not-allowed' : 'pointer',
                                            transition: 'opacity 0.2s ease'
                                        }, onMouseEnter: (e) => {
                                            if (!loading)
                                                e.target.style.opacity = '0.9';
                                        }, onMouseLeave: (e) => {
                                            e.target.style.opacity = '1';
                                        }, children: loading ? 'Connexion...' : 'Se connecter' })] }), _jsx("div", { style: {
                                    padding: '16px 32px 24px',
                                    textAlign: 'center',
                                    borderTop: '1px solid rgba(255,255,255,0.06)'
                                }, children: _jsx("p", { style: {
                                        fontSize: '12px',
                                        color: 'rgba(255,255,255,0.3)',
                                        margin: 0
                                    }, children: "Acc\u00E8s r\u00E9serv\u00E9 au personnel autoris\u00E9" }) })] }), _jsx("p", { style: {
                            textAlign: 'center',
                            marginTop: '24px',
                            fontSize: '12px',
                            color: 'rgba(255,255,255,0.3)'
                        }, children: "\u00A9 2024 Fondation SCP \u2022 Intranet s\u00E9curis\u00E9" })] })] }));
};
