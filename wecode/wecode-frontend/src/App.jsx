import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProblemsPage from './pages/ProblemsPage'
import ProblemDetailPage from './pages/ProblemDetailPage'
import AdminPage from './pages/AdminPage'
import LoginPage from './pages/LoginPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import { useAuth } from './contexts/AuthContext'

const ProtectedRoute = ({ children }) => {
    const { isLoggedIn, loading } = useAuth();
    const location = useLocation();

    if (loading) return <div className="state-box"><div className="spinner"></div></div>;
    
    if (!isLoggedIn()) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return children;
};

const AdminRoute = ({ children }) => {
    const { isAdmin, loading } = useAuth();
    if (loading) return <div className="state-box"><div className="spinner"></div></div>;
    return isAdmin() ? children : <Navigate to="/" replace />;
};

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/"               element={<ProblemsPage />} />
          <Route path="/login"          element={<LoginPage />} />
          <Route path="/auth/callback"  element={<AuthCallbackPage />} />
          <Route path="/problems/:id"   element={<ProtectedRoute><ProblemDetailPage /></ProtectedRoute>} />
          <Route path="/admin"          element={<AdminRoute><AdminPage /></AdminRoute>} />
          <Route path="*"               element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
