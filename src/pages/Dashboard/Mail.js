import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useAuth, getAuthHeaders } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config';
const Mail = () => {
    // Messages state
    const [messages, setMessages] = useState([]);
    const [selectedMsg, setSelectedMsg] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    // Folder & navigation
    const [currentFolder, setCurrentFolder] = useState('inbox');
    const [folderCounts, setFolderCounts] = useState({
        inbox: 0, sent: 0, drafts: 0, archived: 0, trash: 0
    });
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [aliases, setAliases] = useState([]);
    // Compose mode
    const [showCompose, setShowCompose] = useState(false);
    const [composingMessageId, setComposingMessageId] = useState(null);
    const [composeForm, setComposeForm] = useState({
        recipient_id: '',
        subject: '',
        body: '',
        priority: 'information'
    });
    // UI state
    const [users, setUsers] = useState([]);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { user } = useAuth();
    useEffect(() => {
        if (user) {
            fetchMessages();
            fetchUsers();
            fetchFolderCounts();
            fetchAliases();
        }
    }, [user, currentFolder, page]);
    const fetchFolderCounts = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/messages/folders`, {
                headers: getAuthHeaders(),
            });
            if (response.ok) {
                const data = await response.json();
                setFolderCounts(data);
            }
        }
        catch (err) {
            console.error('Error fetching folder counts:', err);
        }
    };
    const fetchAliases = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/message-aliases`, {
                headers: getAuthHeaders(),
            });
            if (response.ok) {
                const data = await response.json();
                setAliases(data);
            }
        }
        catch (err) {
            console.error('Error fetching aliases:', err);
        }
    };
    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/annuaire`, {
                headers: getAuthHeaders(),
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        }
        catch (err) {
            console.error('Error fetching users:', err);
        }
    };
    const fetchMessages = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/messages/inbox?folder=${currentFolder}&page=${page}`, { headers: getAuthHeaders() });
            if (!response.ok)
                throw new Error('Erreur lors du chargement des messages');
            const data = await response.json();
            // Handle new pagination format
            if (data.messages) {
                setMessages(data.messages);
                setTotalPages(data.pages || 1);
            }
            else {
                setMessages(data);
            }
            setError('');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        }
        finally {
            setLoading(false);
        }
    };
    const searchMessages = async () => {
        if (!searchQuery.trim())
            return;
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/messages/search/query?q=${encodeURIComponent(searchQuery)}&folder=${currentFolder}`, { headers: getAuthHeaders() });
            if (response.ok) {
                const data = await response.json();
                setMessages(data);
            }
        }
        catch (err) {
            console.error('Error searching:', err);
        }
        finally {
            setLoading(false);
        }
    };
    const markAsRead = async (msgId, isRead) => {
        try {
            const endpoint = isRead ? 'unread' : 'read';
            await fetch(`${API_BASE_URL}/messages/${msgId}/${endpoint}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
            });
            setMessages(messages.map(m => m.id === msgId ? { ...m, is_read: !isRead } : m));
            setSelectedMsg(null);
            fetchFolderCounts();
        }
        catch (err) {
            console.error('Error toggling read status:', err);
        }
    };
    const moveToFolder = async (msgId, folder) => {
        try {
            const response = await fetch(`${API_BASE_URL}/messages/${msgId}/folder`, {
                method: 'PATCH',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder })
            });
            if (response.ok) {
                setMessages(messages.filter(m => m.id !== msgId));
                setSelectedMsg(null);
                fetchFolderCounts();
            }
        }
        catch (err) {
            console.error('Error moving message:', err);
        }
    };
    const deleteMessage = async (msgId) => {
        if (confirm('Supprimer ce message ?')) {
            try {
                await fetch(`${API_BASE_URL}/messages/${msgId}`, {
                    method: 'DELETE',
                    headers: getAuthHeaders(),
                });
                setMessages(messages.filter(m => m.id !== msgId));
                setSelectedMsg(null);
                fetchFolderCounts();
            }
            catch (err) {
                console.error('Error deleting message:', err);
            }
        }
    };
    const saveOrSendMessage = async () => {
        if (!composeForm.recipient_id || !composeForm.subject.trim() || !composeForm.body.trim()) {
            setError('Veuillez remplir tous les champs requis');
            return;
        }
        try {
            setSendingMessage(true);
            setError('');
            // If it's a draft update, save draft
            // Otherwise, send the message
            const endpoint = composingMessageId ? 'draft' : 'send';
            const response = await fetch(`${API_BASE_URL}/messages/${endpoint}`, {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: composingMessageId,
                    ...composeForm,
                    recipient_id: parseInt(composeForm.recipient_id)
                })
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Erreur lors de l\'envoi');
            }
            setSuccessMessage(composingMessageId ? 'Brouillon enregistré' : 'Message envoyé avec succès !');
            resetCompose();
            setTimeout(() => {
                setSuccessMessage('');
                fetchMessages();
                fetchFolderCounts();
            }, 1500);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        }
        finally {
            setSendingMessage(false);
        }
    };
    const resetCompose = () => {
        setShowCompose(false);
        setComposingMessageId(null);
        setComposeForm({
            recipient_id: '',
            subject: '',
            body: '',
            priority: 'information'
        });
    };
    const editDraft = (draft) => {
        setComposingMessageId(draft.id);
        setComposeForm({
            recipient_id: draft.recipient_id.toString(),
            subject: draft.subject,
            body: draft.body,
            priority: draft.priority
        });
        setShowCompose(true);
        setSelectedMsg(null);
    };
    const selectedMessage = messages.find(m => m.id === selectedMsg);
    // UI: Compose Mode
    if (showCompose) {
        return (_jsxs("div", { style: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '24px' }, children: [_jsx("button", { onClick: resetCompose, style: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', marginBottom: '16px' }, children: "\u2190 Retour" }), _jsx("h2", { style: { fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '24px' }, children: composingMessageId ? 'Éditer brouillon' : 'Nouveau message' }), successMessage && (_jsxs("div", { style: { padding: '12px 16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '10px', color: '#34d399', marginBottom: '16px' }, children: ["\u2713 ", successMessage] })), error && (_jsx("div", { style: { padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', color: '#f87171', marginBottom: '16px' }, children: error })), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '16px' }, children: [_jsxs("div", { children: [_jsx("label", { style: { display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }, children: "Destinataire" }), _jsxs("select", { value: composeForm.recipient_id, onChange: (e) => setComposeForm({ ...composeForm, recipient_id: e.target.value }), style: { width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '14px', color: '#fff', cursor: 'pointer' }, children: [_jsx("option", { value: "", children: "S\u00E9lectionner..." }), users.map(u => _jsx("option", { value: u.id, children: u.username }, u.id))] })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }, children: "Priorit\u00E9" }), _jsxs("select", { value: composeForm.priority, onChange: (e) => setComposeForm({ ...composeForm, priority: e.target.value }), style: { width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '14px', color: '#fff' }, children: [_jsx("option", { value: "information", children: "Information" }), _jsx("option", { value: "alerte", children: "Alerte" }), _jsx("option", { value: "critique", children: "Critique" })] })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }, children: "Objet" }), _jsx("input", { type: "text", value: composeForm.subject, onChange: (e) => setComposeForm({ ...composeForm, subject: e.target.value }), placeholder: "Objet du message...", style: { width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '14px', color: '#fff' } })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }, children: "Message" }), _jsx("textarea", { value: composeForm.body, onChange: (e) => setComposeForm({ ...composeForm, body: e.target.value }), placeholder: "Votre message...", rows: 10, style: { width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '14px', color: '#fff', resize: 'vertical', fontFamily: 'inherit' } })] }), _jsxs("div", { style: { display: 'flex', gap: '12px' }, children: [_jsx("button", { onClick: () => { saveOrSendMessage(); }, disabled: sendingMessage, style: { flex: 1, padding: '14px 24px', background: sendingMessage ? 'rgba(59, 130, 246, 0.5)' : '#3b82f6', border: 'none', borderRadius: '8px', color: '#fff', cursor: sendingMessage ? 'not-allowed' : 'pointer' }, children: sendingMessage ? '...' : (composingMessageId ? 'Enregistrer' : 'Envoyer') }), composingMessageId && (_jsx("button", { onClick: () => deleteMessage(composingMessageId), style: { padding: '14px 24px', background: '#ef4444', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }, children: "Supprimer" }))] })] })] }));
    }
    // UI: Main Mail View
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '24px' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs("div", { children: [_jsx("h2", { style: { fontSize: '20px', fontWeight: 600, color: '#fff', margin: '0 0 8px 0' }, children: "Messagerie" }), _jsxs("p", { style: { fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0 }, children: [messages.length, " message", messages.length > 1 ? 's' : '', " \u2022 ", folderCounts.inbox, " non lu", folderCounts.inbox > 1 ? 's' : ''] })] }), _jsx("button", { onClick: () => setShowCompose(true), style: { padding: '10px 16px', background: '#3b82f6', border: 'none', borderRadius: '8px', fontSize: '13px', color: '#fff', cursor: 'pointer' }, children: "+ Nouveau" })] }), _jsxs("div", { style: { display: 'flex', gap: '12px' }, children: [_jsx("input", { type: "text", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), placeholder: "Rechercher...", onKeyPress: (e) => e.key === 'Enter' && searchMessages(), style: { flex: 1, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '13px', color: '#fff' } }), _jsx("button", { onClick: searchMessages, style: { padding: '10px 16px', background: '#3b82f6', border: 'none', borderRadius: '8px', fontSize: '13px', color: '#fff', cursor: 'pointer' }, children: "\uD83D\uDD0D" })] }), error && _jsx("div", { style: { padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', color: '#f87171' }, children: error }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '200px 1fr 2fr', gap: '24px' }, children: [_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '8px' }, children: ['inbox', 'sent', 'drafts', 'archived', 'trash'].map(folder => (_jsxs("button", { onClick: () => { setCurrentFolder(folder); setPage(0); setSelectedMsg(null); }, style: { padding: '12px 16px', background: currentFolder === folder ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)', border: '1px solid ' + (currentFolder === folder ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.08)'), borderRadius: '8px', fontSize: '13px', color: currentFolder === folder ? '#3b82f6' : 'rgba(255,255,255,0.7)', cursor: 'pointer', textAlign: 'left', textTransform: 'capitalize' }, children: [folder, " ", folderCounts[folder] > 0 && `(${folderCounts[folder]})`] }, folder))) }), _jsx("div", { style: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden' }, children: loading ? (_jsx("div", { style: { padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }, children: "Chargement..." })) : messages.length === 0 ? (_jsx("div", { style: { padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }, children: "Aucun message" })) : (_jsx("div", { children: messages.map((msg) => (_jsxs("button", { onClick: () => setSelectedMsg(msg.id), style: { width: '100%', padding: '16px', background: selectedMsg === msg.id ? 'rgba(59, 130, 246, 0.1)' : msg.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.05)', border: selectedMsg === msg.id ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.06)', borderBottom: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontSize: '13px', fontWeight: msg.is_read ? 400 : 600, color: '#fff', marginBottom: '4px' }, children: msg.sender?.username || 'Système' }), _jsx("div", { style: { fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }, children: msg.subject }), _jsx("div", { style: { fontSize: '11px', color: 'rgba(255,255,255,0.4)' }, children: new Date(msg.created_at).toLocaleDateString() })] }), _jsxs("div", { style: { display: 'flex', gap: '8px', alignItems: 'center' }, children: [_jsx("span", { style: { fontSize: '11px', padding: '4px 8px', background: msg.priority === 'critique' ? 'rgba(239, 68, 68, 0.2)' : msg.priority === 'alerte' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)', borderRadius: '4px', color: msg.priority === 'critique' ? '#f87171' : msg.priority === 'alerte' ? '#fbbf24' : '#60a5fa' }, children: msg.priority }), !msg.is_read && _jsx("span", { style: { width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%' } })] })] }, msg.id))) })) }), _jsx("div", { style: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }, children: selectedMessage ? (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("p", { style: { fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: '0 0 8px 0' }, children: "DE" }), _jsx("p", { style: { fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }, children: selectedMessage.sender?.username })] }), _jsxs("div", { children: [_jsx("p", { style: { fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: '0 0 8px 0' }, children: "OBJET" }), _jsx("p", { style: { fontSize: '14px', fontWeight: 500, color: '#fff', margin: 0 }, children: selectedMessage.subject })] }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("p", { style: { fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: '0 0 8px 0' }, children: "CONTENU" }), _jsx("p", { style: { fontSize: '13px', color: 'rgba(255,255,255,0.8)', margin: 0, whiteSpace: 'pre-wrap' }, children: selectedMessage.body })] }), _jsxs("div", { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' }, children: [_jsx("button", { onClick: () => markAsRead(selectedMessage.id, selectedMessage.is_read), style: { padding: '8px 12px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', fontSize: '12px', color: '#60a5fa', cursor: 'pointer' }, children: selectedMessage.is_read ? 'Marquer comme non lu' : 'Marquer comme lu' }), _jsx("button", { onClick: () => moveToFolder(selectedMessage.id, 'archived'), style: { padding: '8px 12px', background: 'rgba(251, 191, 36, 0.2)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '6px', fontSize: '12px', color: '#fbbf24', cursor: 'pointer' }, children: "Archiver" }), _jsx("button", { onClick: () => deleteMessage(selectedMessage.id), style: { padding: '8px 12px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', fontSize: '12px', color: '#f87171', cursor: 'pointer' }, children: "Supprimer" }), currentFolder === 'drafts' && (_jsx("button", { onClick: () => editDraft(selectedMessage), style: { padding: '8px 12px', background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '6px', fontSize: '12px', color: '#86efac', cursor: 'pointer' }, children: "\u00C9diter" }))] })] })) : (_jsx("div", { style: { textAlign: 'center', color: 'rgba(255,255,255,0.5)' }, children: "S\u00E9lectionner un message" })) })] })] }));
};
export default Mail;
