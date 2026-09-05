import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [indices, setIndices] = useState([]);
  const [watchlistCount, setWatchlistCount] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadIndices() {
      try {
        const response = await api.get('/api/indices');
        if (active) setIndices(response.data);
      } catch {
        if (active) setIndices([]);
      }
    }

    loadIndices();
    const intervalId = window.setInterval(loadIndices, 45000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadWatchlistCount() {
      try {
        const response = await api.get('/api/watchlist');
        if (active) setWatchlistCount(response.data.length);
      } catch {
        if (active) setWatchlistCount(null);
      }
    }

    loadWatchlistCount();
    const intervalId = window.setInterval(loadWatchlistCount, 45000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() || 'A';

  return (
    <div className="app-shell">
      <header className="app-nav">
        <NavLink to="/dashboard" className="app-brand" aria-label="Signal watchlist">
          <span className="dashboard-brand-mark">S</span>
          <span>Signal</span>
        </NavLink>
        <nav className="app-nav-links" aria-label="Primary navigation">
          <NavLink to="/explore" className={({ isActive }) => `app-nav-link${isActive ? ' app-nav-link--active' : ''}`}>Explore</NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => `app-nav-link${isActive ? ' app-nav-link--active' : ''}`}>Watchlist</NavLink>
        </nav>
        <div className="app-nav-actions">
          <input className="app-nav-search" placeholder="Search" aria-label="Search" readOnly />
          <div className="profile-menu">
            <button
              type="button"
              className="profile-button"
              aria-label="Open profile menu"
              aria-expanded={isProfileOpen}
              onClick={() => setIsProfileOpen((open) => !open)}
            >
              {initial}
            </button>
            {isProfileOpen && (
              <div className="profile-dropdown">
                <strong>{user?.name || 'Account'}</strong>
                <span>{user?.email || ''}</span>
                <div className="profile-watchlist-count">
                  <span>Watchlist</span>
                  <strong>{watchlistCount == null ? '—' : `${watchlistCount} ${watchlistCount === 1 ? 'stock' : 'stocks'}`}</strong>
                </div>
                <button type="button" onClick={handleLogout}>Log out</button>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="index-ticker" aria-label="Market indices">
        <div className="index-ticker-inner">
          {indices.map((index) => (
            <div className="index-item" key={index.name}>
              <span className="index-name">{index.name}</span>
              <strong>{index.value.toLocaleString('en-IN')}</strong>
              <span className={index.changePercent >= 0 ? 'index-change index-change--up' : 'index-change index-change--down'}>
                {index.changePercent >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
      <main className="app-shell-content">
        <Outlet />
      </main>
    </div>
  );
}

export default AppShell;
