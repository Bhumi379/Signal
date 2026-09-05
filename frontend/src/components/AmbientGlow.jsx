import { useEffect, useState } from 'react';

function AmbientGlow() {
  const [isPaused, setIsPaused] = useState(() => (
    document.visibilityState !== 'visible'
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ));

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateState = () => {
      setIsPaused(document.visibilityState !== 'visible' || motionQuery.matches);
    };

    document.addEventListener('visibilitychange', updateState);
    motionQuery.addEventListener('change', updateState);
    return () => {
      document.removeEventListener('visibilitychange', updateState);
      motionQuery.removeEventListener('change', updateState);
    };
  }, []);

  return <div className={`ambient-glow${isPaused ? ' ambient-glow--paused' : ''}`} aria-hidden="true" />;
}

export default AmbientGlow;