import React, { useRef, useEffect } from 'react';
import type { ChartConfig } from './types';

interface HeatmapDataPoint {
  day: number; // 0-6
  hour: number; // 0-23
  value: number;
}

interface HeatmapChartProps {
  data: HeatmapDataPoint[];
  config?: ChartConfig;
  className?: string;
  days?: string[];
  hours?: string[];
}

export const HeatmapChart: React.FC<HeatmapChartProps> = ({
  data,
  config = {},
  className = '',
  days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  hours = Array.from({ length: 24 }, (_, i) => `${i}:00`),
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const {
    width = 700,
    height = 300,
    padding = { top: 30, right: 20, bottom: 40, left: 50 },
    animate = true,
  } = config;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const cellWidth = chartWidth / 7;
    const cellHeight = chartHeight / 24;

    const maxValue = Math.max(...data.map((d) => d.value), 1);
    const hue = 0; // Red hue for heatmap

    svg.innerHTML = '';

    // Draw cells
    data.forEach((point, i) => {
      const intensity = point.value / maxValue;
      const opacity = 0.2 + intensity * 0.8;
      const color = `hsla(${hue}, 70%, 45%, ${opacity})`;

      const x = padding.left + point.day * cellWidth;
      const y = padding.top + (23 - point.hour) * cellHeight;

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(x + 1));
      rect.setAttribute('y', String(y + 1));
      rect.setAttribute('width', String(cellWidth - 2));
      rect.setAttribute('height', String(cellHeight - 2));
      rect.setAttribute('fill', color);
      rect.setAttribute('rx', '2');
      rect.setAttribute('ry', '2');
      if (animate) {
        rect.style.opacity = '0';
        rect.style.animation = `fadeIn 0.3s ease-out ${i * 0.01}s forwards`;
      }
      svg.appendChild(rect);
    });

    // Day labels (top)
    const dayLabels = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    dayLabels.setAttribute('font-size', '12');
    dayLabels.setAttribute('fill', 'currentColor');
    dayLabels.setAttribute('opacity', '0.6');
    dayLabels.setAttribute('text-anchor', 'middle');

    days.forEach((day, i) => {
      const x = padding.left + i * cellWidth + cellWidth / 2;
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(x));
      text.setAttribute('y', String(padding.top - 8));
      text.textContent = day;
      dayLabels.appendChild(text);
    });
    svg.appendChild(dayLabels);

    // Hour labels (left)
    const hourLabels = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    hourLabels.setAttribute('font-size', '10');
    hourLabels.setAttribute('fill', 'currentColor');
    hourLabels.setAttribute('opacity', '0.6');
    hourLabels.setAttribute('text-anchor', 'end');
    hourLabels.setAttribute('dominant-baseline', 'middle');

    for (let h = 0; h < 24; h += 2) {
      const y = padding.top + (23 - h) * cellHeight + cellHeight / 2;
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(padding.left - 8));
      text.setAttribute('y', String(y));
      text.textContent = `${h}:00`;
      hourLabels.appendChild(text);
    }
    svg.appendChild(hourLabels);

    // Color legend
    const legend = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    legend.setAttribute('font-size', '11');
    legend.setAttribute('fill', 'currentColor');

    const legendText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    legendText.setAttribute('x', String(width - padding.right + 10));
    legendText.setAttribute('y', String(padding.top));
    legendText.textContent = 'Intensity';
    legend.appendChild(legendText);

    for (let i = 0; i < 5; i++) {
      const y = padding.top + 20 + i * 20;
      const intensity = i / 4;
      const opacity = 0.2 + intensity * 0.8;
      const color = `hsla(${hue}, 70%, 45%, ${opacity})`;

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(width - padding.right + 10));
      rect.setAttribute('y', String(y));
      rect.setAttribute('width', '16');
      rect.setAttribute('height', '16');
      rect.setAttribute('fill', color);
      rect.setAttribute('rx', '2');
      legend.appendChild(rect);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(width - padding.right + 32));
      text.setAttribute('y', String(y + 12));
      text.textContent = i === 0 ? 'Low' : i === 4 ? 'High' : '';
      legend.appendChild(text);
    }
    svg.appendChild(legend);

    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `
      @keyframes fadeIn {
        to { opacity: 1; }
      }
    `;
    svg.appendChild(style);
  }, [data, width, height, padding, days, hours, animate]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full h-full ${className}`}
      role="img"
      aria-label="Heatmap chart"
    />
  );
};