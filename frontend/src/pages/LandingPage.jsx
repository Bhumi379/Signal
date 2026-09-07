import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import MarketHero from '../components/MarketHero';
import Background3D from '../components/Background3D';
import LandingAnimation, { hasSeenIntro } from '../components/LandingAnimation';
import LoginForm from '../components/LoginForm';

function LandingPage() {
  const [playIntro, setPlayIntro] = useState(() => !hasSeenIntro());
  const [contentVisible, setContentVisible] = useState(() => hasSeenIntro());

  useEffect(() => {
    if (!playIntro) {
      setContentVisible(true);
    }
  }, [playIntro]);

  useEffect(() => {
    if (playIntro) {
      const timer = setTimeout(() => setPlayIntro(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [playIntro]);

  function handleIntroComplete() {
    setPlayIntro(false);
    setContentVisible(true);
  }

  return (
    <div className="auth-page">
      <Background3D />
      {!playIntro && <MarketHero />}
      <LandingAnimation play={playIntro} onComplete={handleIntroComplete} />

      <motion.main
        className="auth-main"
        initial={false}
        animate={{
          opacity: contentVisible ? 1 : 0,
          y: contentVisible ? 0 : 20,
        }}
        transition={{
          duration: 0.5,
          ease: [0.22, 1, 0.36, 1],
          delay: playIntro ? 0.2 : 0,
        }}
      >
        <LoginForm />
      </motion.main>
    </div>
  );
}

export default LandingPage;