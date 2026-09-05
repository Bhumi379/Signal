import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Background3D from '../components/Background3D';
import { hasSeenIntro } from '../components/LandingAnimation';
import SignalMark from '../components/SignalMark';
import MarketHero from '../components/MarketHero';

function SignupPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const introSeen = hasSeenIntro();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const { data } = await api.post('/api/auth/signup', { name, email, password });
      login(data.token, data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="auth-page">
      <Background3D />
      <MarketHero />
      <div className={`auth-logo ${introSeen ? 'auth-logo--settled' : ''}`}><SignalMark /><span>Signal</span></div>

      <main className="auth-main">
        <div className="auth-form-wrap">
          <h1 className="auth-heading">Create account</h1>
          <p className="auth-subtext">One step, then you are in.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <p className="form-error">{error}</p>}

            <label className="form-field">
              <span>Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </label>

            <label className="form-field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label className="form-field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default SignupPage;
