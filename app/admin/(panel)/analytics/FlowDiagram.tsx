import type { FlowLink } from "@/lib/analytics";

// The flow diagram (Admin → Analytics → Pages & journeys): how visits move from page to page.
// Each column is a step of the visit (1st page, 2nd page...); band widths are numbers of visits.

const LEFT = "Left the website";
const OTHER = "Other pages";
const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th"];

type Node = { id: string; col: number; label: string; value: number; y: number; h: number; outY: number; inY: number };

const short = (s: string, n = 26) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export default function FlowDiagram({ links, steps }: { links: FlowLink[]; steps: number }) {
  if (!links.length) return <p className="admin-muted">Not enough visits yet to show how people move through the website.</p>;

  const W = 1000, H = 440, top = 34, nodeW = 12, gap = 14;
  const nodes = new Map<string, Node>();
  const node = (col: number, label: string) => {
    const id = `${col}|${label}`;
    if (!nodes.has(id)) nodes.set(id, { id, col, label, value: 0, y: 0, h: 0, outY: 0, inY: 0 });
    return nodes.get(id)!;
  };
  const ins = new Map<string, number>();
  const outs = new Map<string, number>();
  for (const l of links) {
    const a = node(l.step, l.source), b = node(l.step + 1, l.target);
    outs.set(a.id, (outs.get(a.id) ?? 0) + l.visits);
    ins.set(b.id, (ins.get(b.id) ?? 0) + l.visits);
  }
  for (const n of nodes.values()) n.value = Math.max(ins.get(n.id) ?? 0, outs.get(n.id) ?? 0);

  const rank = (n: Node) => (n.label === LEFT ? 2 : n.label === OTHER ? 1 : 0);
  const columns = Array.from({ length: steps }, (_, i) =>
    [...nodes.values()].filter((n) => n.col === i + 1).sort((a, b) => rank(a) - rank(b) || b.value - a.value || a.label.localeCompare(b.label)),
  ).filter((c) => c.length);
  const scale = Math.min(...columns.map((c) => (H - top - gap * (c.length - 1)) / Math.max(1, c.reduce((s, n) => s + n.value, 0))));
  const colX = (col: number) => 4 + ((col - 1) * (W - nodeW - 8)) / Math.max(1, columns.length - 1);
  for (const c of columns) {
    let y = top;
    for (const n of c) {
      n.h = Math.max(2, n.value * scale);
      n.y = n.outY = n.inY = y;
      y += n.h + gap;
    }
  }

  // Bands, stacked in the order of the nodes they join so they don't cross more than they need to.
  const order = (n: Node) => columns[n.col - 1]?.indexOf(n) ?? 0;
  const sorted = [...links].sort(
    (a, b) => a.step - b.step || order(node(a.step, a.source)) - order(node(b.step, b.source)) || order(node(a.step + 1, a.target)) - order(node(b.step + 1, b.target)),
  );
  const bands = sorted.map((l) => {
    const a = node(l.step, l.source), b = node(l.step + 1, l.target);
    const h = Math.max(1, l.visits * scale);
    const x0 = colX(a.col) + nodeW, x1 = colX(b.col), xm = (x0 + x1) / 2;
    const y0 = a.outY, y1 = b.inY;
    a.outY += h;
    b.inY += h;
    return {
      key: `${a.id}>${b.id}`,
      d: `M${x0},${y0}C${xm},${y0} ${xm},${y1} ${x1},${y1}L${x1},${y1 + h}C${xm},${y1 + h} ${xm},${y0 + h} ${x0},${y0 + h}Z`,
      left: b.label === LEFT,
      title: `${l.source} → ${l.target}: ${l.visits} visit${l.visits === 1 ? "" : "s"}`,
    };
  });

  return (
    <div className="analytics-scroll">
      <svg className="analytics-flow-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Flow diagram of how visits move from page to page">
        {columns.map((c, i) => (
          <text key={i} x={colX(i + 1) + (i === columns.length - 1 ? nodeW : 0)} y={14} textAnchor={i === columns.length - 1 ? "end" : "start"} className="analytics-flow-head">
            {ORDINALS[i] ?? `${i + 1}th`} page
          </text>
        ))}
        {bands.map((b) => (
          <path key={b.key} d={b.d} className={b.left ? "analytics-flow-band is-left" : "analytics-flow-band"}>
            <title>{b.title}</title>
          </path>
        ))}
        {[...nodes.values()].map((n) => {
          const last = n.col === columns.length;
          return (
            <g key={n.id}>
              <rect x={colX(n.col)} y={n.y} width={nodeW} height={n.h} rx={3} className={`analytics-flow-node${n.label === LEFT ? " is-left" : n.label === OTHER ? " is-other" : ""}`}>
                <title>{`${n.label}: ${n.value} visit${n.value === 1 ? "" : "s"}`}</title>
              </rect>
              {n.h >= 9 && (
                <text x={last ? colX(n.col) - 6 : colX(n.col) + nodeW + 6} y={n.y + Math.min(n.h / 2, 14) + 4} textAnchor={last ? "end" : "start"} className="analytics-flow-label">
                  {short(n.label, n.col === columns.length - 1 ? 20 : last ? 18 : 30)} <tspan className="analytics-flow-count">{n.value}</tspan>
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
