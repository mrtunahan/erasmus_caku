import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { LoginModal } from './components/auth/LoginModal'; // We need to extract this
import { C } from './constants/theme';

import { ExamAutomationPage, ErasmusPage, StudentPortalPage, CourseExemptionPage, YazOkuluPage } from './pages';

// Placeholder components for pages we haven't extracted yet
// ErasmusPage imported from ./pages



function AppContent() {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    // Restore session
    useEffect(() => {
        const saved = localStorage.getItem("caku_current_user");
        if (saved) {
            setCurrentUser(JSON.parse(saved));
        }
        setLoading(false);
    }, []);

    const handleLogin = (user) => {
        setCurrentUser(user);
        localStorage.setItem("caku_current_user", JSON.stringify(user));
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem("caku_current_user");
    };

    if (loading) return <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}>Yükleniyor...</div>;

    if (!currentUser) {
        return <LoginModal onLogin={handleLogin} />;
    }

    // Role based protection helper
    const RequireRole = ({ children, roles }) => {
        if (!roles.includes(currentUser.role) && currentUser.role !== 'admin') {
            return <Navigate to="/erasmus" replace />;
        }
        return children;
    };

    return (
        <Layout
            currentRoute={location.pathname.substring(1) || 'erasmus'}
            onNavigate={(path) => window.location.href = "/" + path} // Basic nav for now
            currentUser={currentUser}
            onLogout={handleLogout}
        >
            <Routes>
                <Route path="/" element={<Navigate to="/erasmus" replace />} />


                <Route path="/sinav" element={
                    <RequireRole roles={['professor', 'admin']}>
                        <ExamAutomationPage currentUser={currentUser} />
                    </RequireRole>
                } />

                <Route path="/muafiyet" element={
                    <RequireRole roles={['admin', 'professor']}>
                        <CourseExemptionPage />
                    </RequireRole>
                } />

                <Route path="/portal" element={<StudentPortalPage currentUser={currentUser} />} />

                <Route path="/yazokulu" element={<YazOkuluPage currentUser={currentUser} />} />
            </Routes>
        </Layout>
    );
}

function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

export default App;
