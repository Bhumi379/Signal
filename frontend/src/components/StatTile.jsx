import { useRef } from 'react';

function StatTile({ className = '', children }) {
  const tileRef = useRef(null);

  function handleMouseMove(event) {
    const tile = tileRef.current;
    if (!tile
      || document.visibilityState !== 'visible'
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const bounds = tile.getBoundingClientRect();
    const offsetX = (event.clientX - bounds.left) / bounds.width - 0.5;
    const offsetY = (event.clientY - bounds.top) / bounds.height - 0.5;
    const rotateX = Math.max(-7, Math.min(7, -offsetY * 14));
    const rotateY = Math.max(-7, Math.min(7, offsetX * 14));

    tile.style.transition = 'none';
    tile.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    tile.style.boxShadow = '0 12px 28px var(--accent-dim)';
  }

  function handleMouseLeave() {
    const tile = tileRef.current;
    if (!tile) return;

    tile.style.transition = 'transform 300ms ease-out, box-shadow 300ms ease-out';
    tile.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)';
    tile.style.boxShadow = '';
  }

  return (
    <div
      ref={tileRef}
      className={`watchlist-stat-tile ${className}`.trim()}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}

export default StatTile;
