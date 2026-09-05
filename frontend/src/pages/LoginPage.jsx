import Background3D from '../components/Background3D';
import LoginForm from '../components/LoginForm';
import { hasSeenIntro } from '../components/LandingAnimation';
import SignalMark from '../components/SignalMark';
import MarketHero from '../components/MarketHero';

function LoginPage() {
  const introSeen = hasSeenIntro();

  return (
    <div className="auth-page">
      <Background3D />
      <MarketHero />
      <div className={`auth-logo ${introSeen ? 'auth-logo--settled' : ''}`}><SignalMark /><span>Signal</span></div>

      <main className="auth-main">
        <LoginForm />
      </main>
    </div>
  );
}

export default LoginPage;
