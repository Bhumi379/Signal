import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-brand">Signal</div>
        <button type="button" className="btn-ghost" onClick={handleLogout}>
          Sign out
        </button>
      </header>

      <main className="dashboard-main">
        <h1 className="dashboard-heading">Dashboard</h1>
        <p className="dashboard-subtext">
          Welcome{user?.name ? `, ${user.name}` : ''}. Your watchlist will appear here.
        </p>
      </main>
    </div>
  );
}

export default DashboardPage;
