import { jsx as _jsx } from "react/jsx-runtime";
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
function AppContent() {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? _jsx(Dashboard, {}) : _jsx(Login, {});
}
function App() {
    return (_jsx(AuthProvider, { children: _jsx(AppContent, {}) }));
}
export default App;
