import { lazy, Suspense } from 'react';

const WIDTH = 92;
const HEIGHT = 32;
const TrendSparklineChart = lazy(() => import('./TrendSparklineChart'));

function numericValues(points) {
  return (Array.isArray(points) ? points : [])
    .map((point) => (typeof point === 'number' ? point : point?.value))
    .filter((value) => typeof value === 'number' && Number.isFinite(value));
}

function TrendSparkline({ points, percentChange }) {
  const values = numericValues(points);
  const stroke = typeof percentChange !== 'number' || !Number.isFinite(percentChange)
    ? 'var(--text-dim)'
    : percentChange > 0 ? 'var(--up)' : percentChange < 0 ? 'var(--down)' : 'var(--text-dim)';

  if (values.length < 2) {
    return (
      <svg
        className="trend-sparkline"
        width={WIDTH}
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        aria-hidden="true"
      >
        <line
          x1="4"
          y1={HEIGHT / 2}
          x2={WIDTH - 4}
          y2={HEIGHT / 2}
          stroke="var(--text-dim)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <Suspense fallback={<span className="trend-sparkline trend-sparkline--loading" aria-hidden="true" />}>
      <TrendSparklineChart values={values} stroke={stroke} width={WIDTH} height={HEIGHT} />
    </Suspense>
  );
}

export default TrendSparkline;
