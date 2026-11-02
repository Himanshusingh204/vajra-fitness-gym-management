const NS = 'http://www.w3.org/2000/svg';

interface Pad {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const formatTick = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${+(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1000) return `${+(v / 1000).toFixed(1)}k`;
  return String(+v.toFixed(1));
};

// Five value labels down the left edge, matching the four grid bands.
export function drawYAxis(svg: SVGSVGElement, pad: Pad, height: number, min: number, max: number) {
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('font-size', '11');
  g.setAttribute('fill', 'currentColor');
  g.setAttribute('opacity', '0.6');
  g.setAttribute('text-anchor', 'end');
  const chartHeight = height - pad.top - pad.bottom;
  for (let i = 0; i <= 4; i++) {
    const text = document.createElementNS(NS, 'text');
    text.setAttribute('x', String(pad.left - 8));
    text.setAttribute('y', String(pad.top + (chartHeight / 4) * i + 4));
    text.textContent = formatTick(max - ((max - min) / 4) * i);
    g.appendChild(text);
  }
  svg.appendChild(g);
}

export function drawEmpty(svg: SVGSVGElement, width: number, height: number) {
  svg.innerHTML = '';
  const text = document.createElementNS(NS, 'text');
  text.setAttribute('x', String(width / 2));
  text.setAttribute('y', String(height / 2));
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('font-size', '13');
  text.setAttribute('fill', 'currentColor');
  text.setAttribute('opacity', '0.6');
  text.textContent = 'No data yet';
  svg.appendChild(text);
}
