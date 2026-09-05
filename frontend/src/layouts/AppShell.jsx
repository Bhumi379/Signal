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
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

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

    async function loadNotifications() {
      try {
        const response = await api.get('/api/notifications');
        if (active) setNotifications(response.data);
      } catch {
        if (active) setNotifications([]);
      }
    }

    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 45000);
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

  async function markNotificationRead(eventId) {
    setNotifications((current) => current.map((item) => (
      item.eventId === eventId ? { ...item, isUnread: false } : item
    )));
    try {
      await api.post(`/api/notifications/${eventId}/read`);
    } catch {
      // Keep the optimistic state; the next poll will reconcile it.
    }
  }

  async function markAllNotificationsRead() {
    const unread = notifications.filter((item) => item.isUnread);
    setNotifications((current) => current.map((item) => ({ ...item, isUnread: false })));
    await Promise.allSettled(unread.map((item) => api.post(`/api/notifications/${item.eventId}/read`)));
  }

  function relativeTime(value) {
    const age = Math.max(0, Date.now() - new Date(value).getTime());
    const minutes = Math.floor(age / 60000);
    if (minutes < 60) return `${minutes || 1}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    if (hours < 48) return 'Yesterday';
    return `${Math.floor(hours / 24)}d ago`;
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
          <div className="notification-menu">
            <button
              type="button"
              className="notification-button"
              aria-label="Open notifications"
              aria-expanded={isNotificationsOpen}
              onClick={() => setIsNotificationsOpen((open) => !open)}
            >
              <span aria-hidden="true">🔔</span>
              {notifications.some((item) => item.isUnread) && (
                <b>{notifications.filter((item) => item.isUnread).length}</b>
              )}
            </button>
            {isNotificationsOpen && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <strong>Notifications</strong>
                  {notifications.some((item) => item.isUnread) && (
                    <button type="button" onClick={markAllNotificationsRead}>Mark all as read</button>
                  )}
                </div>
                {!notifications.length ? (
                  <div className="notification-empty"><span aria-hidden="true">○</span><p>No alerts right now</p></div>
                ) : (
                  <div className="notification-list">
                    {notifications.map((item) => (
                      <article
                        className={`notification-item${item.isUnread ? ' notification-item--unread' : ''}`}
                        key={item.eventId}
                        onClick={() => item.isUnread && markNotificationRead(item.eventId)}
                      >
                        <div className="notification-item-topline">
                          <span className="notification-symbol"><i className={item.magnitude >= 0 ? 'notification-dot--up' : 'notification-dot--down'} />{item.symbol}</span>
                          <time>{relativeTime(item.detectedAt)}</time>
                        </div>
                        <p>{item.reason}</p>
                        {item.headlines?.slice(0, 2).map((headline) => (
                          <a key={headline.url} href={headline.url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                            <span>{headline.headline}</span><small>{headline.source}</small>
                          </a>
                        ))}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
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
