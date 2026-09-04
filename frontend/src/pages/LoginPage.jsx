import { motion } from 'framer-motion';
import Background3D from '../components/Background3D';
import LoginForm from '../components/LoginForm';
import { hasSeenIntro } from '../components/LandingAnimation';

function LoginPage() {
  const introSeen = hasSeenIntro();

  return (
    <div className="auth-page">
      <Background3D />
      <div className={`auth-logo ${introSeen ? 'auth-logo--settled' : ''}`}>Signal</div>

      <motion.main
        className="auth-main"
        initial={introSeen ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <LoginForm />
      </motion.main>
    </div>
  );
}

export default LoginPage;
