import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'

export default function Navbar() {
  const { pathname } = useLocation()
  const { theme, toggleTheme } = useTheme()

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="brand-logo">&lt;/&gt;</span>
        <span className="brand-name">WeCode</span>
      </Link>

      <div className="navbar-center">
        <Link to="/"      className={`nav-link ${pathname === '/' ? 'active' : ''}`}>Problems</Link>
        <Link to="/admin" className={`nav-link ${pathname === '/admin' ? 'active' : ''}`}>Admin</Link>
      </div>

      <div className="navbar-right">
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
