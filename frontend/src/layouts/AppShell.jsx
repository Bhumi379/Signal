import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AmbientGlow from '../components/AmbientGlow';
import SignalMark from '../components/SignalMark';
import api from '../services/api';

function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [indices, setIndices] = useState([]);
  const [watchlistCount, setWatchlistCount] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(() => document.visibilityState === 'visible');

  useEffect(() => {
    const handleVisibilityChange = () => setIsPageVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

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
        const response = await api.get('/api/watchlist/count');
        if (active) setWatchlistCount(response.data.count);
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
      <AmbientGlow />
      <header className="app-nav">
        <NavLink to="/dashboard" className="app-brand" aria-label="Signal watchlist">
          <SignalMark />
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
      <div className={`index-ticker${isPageVisible ? '' : ' index-ticker--paused'}`} aria-label="Market indices">
        <div className="index-ticker-track">
          {[indices, indices].map((tickerGroup, groupIndex) => (
            <div className="index-ticker-inner" aria-hidden={groupIndex === 1} key={groupIndex}>
              {tickerGroup.map((index) => (
                <div className="index-item" key={`${groupIndex}-${index.name}`}>
                  <span className="index-name">{index.name}</span>
                  <strong>{index.value.toLocaleString('en-IN')}</strong>
                  <span className={index.changePercent >= 0 ? 'index-change index-change--up' : 'index-change index-change--down'}>
                    {index.changePercent >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <main className="app-shell-content">
        <Outlet />
      </main>
      <footer className="app-footer">
        <p>© 2026 Signal. Market data may be delayed and is for informational purposes only.</p>
        <a
          className="app-footer-github"
          href="https://github.com/Bhumi379/Signal"
          target="_blank"
          rel="noreferrer"
          aria-label="Signal on GitHub"
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"
            />
          </svg>
        </a>
      </footer>
    </div>
  );
}

export default AppShell;
