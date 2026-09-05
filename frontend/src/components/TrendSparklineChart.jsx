import { Line, LineChart, YAxis } from 'recharts';

function paddedDomain(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const pad = span > 0 ? span * 0.15 : Math.max(Math.abs(min) * 0.02, 1);
  return [min - pad, max + pad];
}

function TrendSparklineChart({ values, stroke, width, height }) {
  return (
    <LineChart
      className="trend-sparkline"
      width={width}
      height={height}
      data={values.map((value) => ({ value }))}
      margin={{ top: 3, right: 2, bottom: 3, left: 2 }}
    >
      <YAxis hide width={0} domain={paddedDomain(values)} />
      <Line
        type="linear"
        dataKey="value"
        stroke={stroke}
        strokeWidth={2}
        dot={false}
        isAnimationActive={false}
      />
    </LineChart>
  );
}

export default TrendSparklineChart;
