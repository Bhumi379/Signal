import { motion } from 'framer-motion';
import SignalMark from './SignalMark';

const INTRO_SEEN_KEY = 'signal_intro_seen';

export function hasSeenIntro() {
  return sessionStorage.getItem(INTRO_SEEN_KEY) === 'true';
}

export function markIntroSeen() {
  sessionStorage.setItem(INTRO_SEEN_KEY, 'true');
}

function LandingAnimation({ play, onComplete }) {
  const settled = !play;

  return (
    <motion.div
      className="landing-logo"
      initial={false}
      animate={
        settled
          ? {
              top: '2rem',
              left: '2.5rem',
              x: 0,
              y: 0,
              scale: 1,
              fontSize: '1.25rem',
            }
          : {
              top: '50%',
              left: '50%',
              x: '-50%',
              y: '-50%',
              scale: 1,
              fontSize: 'clamp(2.75rem, 8vw, 4rem)',
            }
      }
      transition={{
        duration: settled ? 0 : 0.75,
        ease: [0.22, 1, 0.36, 1],
        delay: settled ? 0 : 1,
      }}
      onAnimationComplete={() => {
        if (play) {
          markIntroSeen();
          onComplete?.();
        }
      }}
    >
      <span className="landing-logo-lockup"><SignalMark /><span>Signal</span></span>
    </motion.div>
  );
}

export default LandingAnimation;
