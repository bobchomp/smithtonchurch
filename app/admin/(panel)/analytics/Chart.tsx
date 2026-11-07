// Page views (bars) and visitors (line) over the chosen period, drawn as a simple SVG.
export default function Chart({ points }: { points: { label: string; pageviews: number; visitors: number }[] }) {
  const W = 900, H = 260, left = 40, bottom = 28, top = 12;
  const max = Math.max(4, ...points.map((p) => p.pageviews));
  const step = (W - left) / Math.max(1, points.length);
  const y = (v: number) => top + (H - top - bottom) * (1 - v / max);
  const ticks = [0, Math.round(max / 2), max];
  const every = Math.ceil(points.length / 12);
  const line = points.map((p, i) => `${i ? "L" : "M"}${left + step * i + step / 2},${y(p.visitors)}`).join(" ");
  return (
    <figure className="analytics-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Page views and visitors over time">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={W} y1={y(t)} y2={y(t)} stroke="#e3e8ef" />
            <text x={left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6b7686">{t}</text>
          </g>
        ))}
        {points.map((p, i) => (
          <g key={p.label + i}>
            <rect x={left + step * i + step * 0.15} width={step * 0.7} y={y(p.pageviews)} height={Math.max(0, H - bottom - y(p.pageviews))} rx={Math.min(4, step * 0.2)} fill="#c5d2e4">
              <title>{`${p.label}: ${p.pageviews} page views, ${p.visitors} visitors`}</title>
            </rect>
            {i % every === 0 && (
              <text x={left + step * i + step / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#6b7686">{p.label}</text>
            )}
          </g>
        ))}
        <path d={line} fill="none" stroke="#456188" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
      <figcaption>
        <span className="analytics-key analytics-key-bar" /> Page views <span className="analytics-key analytics-key-line" /> Visitors
      </figcaption>
    </figure>
  );
}
