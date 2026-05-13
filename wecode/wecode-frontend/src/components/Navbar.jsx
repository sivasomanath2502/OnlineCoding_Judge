import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { pathname } = useLocation()
  const { theme, toggleTheme } = useTheme()
  const { user, isLoggedIn, isAdmin, logout } = useAuth()

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="navbar-brand">
          <span className="brand-logo">&lt;/&gt;</span>
          <span className="brand-name">WeCode</span>
        </Link>
        <div className="nav-links">
          <Link to="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>Problems</Link>
          {isAdmin() && <Link to="/admin" className={`nav-link ${pathname === '/admin' ? 'active' : ''}`}>Admin</Link>}
        </div>
      </div>

      <div className="navbar-right">
        {isLoggedIn() ? (
          <div className="user-menu">
            <div className="user-info">
              <img src={user.picture} alt={user.name} className="user-avatar" referrerPolicy="no-referrer" />
              <span className="user-name">{user.name}</span>
              {isAdmin() && <span className="admin-badge">Admin</span>}
            </div>
            <button className="logout-btn" onClick={logout}>Logout</button>
          </div>
        ) : (
          <Link to="/login" state={{ from: { pathname } }} className="login-btn">Sign In</Link>
        )}
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </nav>
  )
}
