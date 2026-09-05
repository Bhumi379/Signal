import { useEffect, useRef } from 'react';

function Background3D() {
  const sceneRef = useRef(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!scene || reducedMotion) return undefined;

    let frameId;
    let isVisible = document.visibilityState === 'visible';
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    function handleMouseMove(event) {
      targetX = (event.clientX / window.innerWidth - 0.5) * 5;
      targetY = (event.clientY / window.innerHeight - 0.5) * 5;
    }

    function animate() {
      if (!isVisible) return;
      currentX += (targetX - currentX) * 0.04;
      currentY += (targetY - currentY) * 0.04;
      scene.style.transform = `rotateX(${-currentY}deg) rotateY(${currentX}deg)`;
      frameId = window.requestAnimationFrame(animate);
    }

    function handleVisibilityChange() {
      isVisible = document.visibilityState === 'visible';
      if (isVisible) {
        frameId = window.requestAnimationFrame(animate);
      } else {
        window.cancelAnimationFrame(frameId);
      }
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      scene.style.transform = '';
    };
  }, []);

  return (
    <div className="bg-3d" aria-hidden="true">
      <div className="bg-3d__scene" ref={sceneRef}>
        <div className="bg-3d__plane bg-3d__plane--1" />
        <div className="bg-3d__plane bg-3d__plane--2" />
        <div className="bg-3d__plane bg-3d__plane--3" />
        <div className="bg-3d__grid" />
      </div>
    </div>
  );
}

export default Background3D;
