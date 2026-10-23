// Small inline SVG line chart. The line takes its colour from the text colour of the wrapper.
export function ActivityChart({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  const W = 640, H = 180, PAD_L = 28, PAD_B = 22, TOP = 18;
  const max = Math.max(1, ...data.map((d) => d.value));
  const bw = (W - PAD_L) / data.length;
  const baseY = H - PAD_B;
  const scaleY = (v: number) => baseY - (v / max) * (H - PAD_B - TOP);
  const linePoints = data.map((d, i) => `${PAD_L + i * bw + bw / 2},${scaleY(d.value)}`).join(' ');
  const areaPoints = `${PAD_L},${baseY} ${linePoints} ${PAD_L + (data.length - 1) * bw + bw / 2},${baseY}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full text-accent-ink" role="img" aria-label={label}>
      {[0, 0.5, 1].map((f) => (
        <line key={f} x1={PAD_L} x2={W - 8} y1={baseY - f * (H - PAD_B - TOP)} y2={baseY - f * (H - PAD_B - TOP)} stroke="var(--color-line)" strokeDasharray="4 4" />
      ))}
      <polygon points={areaPoints} fill="currentColor" opacity="0.1" />
      <polyline points={linePoints} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) =>
        d.value > 0 ? <circle key={i} cx={PAD_L + i * bw + bw / 2} cy={scaleY(d.value)} r="3.5" fill="currentColor" /> : null,
      )}
      {data.map((d, i) => (
        <text key={i} x={PAD_L + i * bw + bw / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="var(--color-ink-muted)">
          {d.label}
        </text>
      ))}
      <text x={W - 8} y={TOP} textAnchor="end" fontSize="12" fontWeight="bold" fill="var(--color-ink-muted)">
        {max}
      </text>
    </svg>
  );
}
