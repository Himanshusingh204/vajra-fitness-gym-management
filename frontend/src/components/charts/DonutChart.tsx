import React, { useRef, useEffect, useMemo } from 'react';
import type { ChartDataPoint, ChartConfig } from './types';

interface DonutChartProps {
  data: ChartDataPoint[];
  config?: ChartConfig;
  className?: string;
  innerRadius?: number;
  showLegend?: boolean;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  config = {},
  className = '',
  innerRadius = 0.6,
  showLegend = true,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const {
    width = 300,
    height = 300,
    padding = { top: 20, right: 120, bottom: 20, left: 20 },
    animate = true,
    colors = [
      'var(--color-primary)',
      'var(--color-secondary)',
      'var(--color-accent)',
      'var(--color-primary-light)',
      'var(--color-secondary-light)',
      '#ff7b00',
      'var(--color-primary-dark)',
      '#022417',
    ],
  } = config;

  const pad = useMemo(
    () => ({ top: padding.top, right: padding.right, bottom: padding.bottom, left: padding.left }),
    [padding]
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || data.length === 0) return;

    const chartWidth = width - pad.left - pad.right;
    const chartHeight = height - pad.top - pad.bottom;
    const radius = Math.min(chartWidth, chartHeight) / 2;
    const cx = pad.left + chartWidth / 2;
    const cy = pad.top + chartHeight / 2;
    const innerR = radius * innerRadius;

    const total = data.reduce((sum, d) => sum + d.value, 0);

    svg.innerHTML = '';

    let currentAngle = -Math.PI / 2;

    data.forEach((d, i) => {
      const sliceAngle = (d.value / total) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;

      const x1 = cx + Math.cos(startAngle) * radius;
      const y1 = cy + Math.sin(startAngle) * radius;
      const x2 = cx + Math.cos(endAngle) * radius;
      const y2 = cy + Math.sin(endAngle) * radius;

      const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

      const innerX1 = cx + Math.cos(startAngle) * innerR;
      const innerY1 = cy + Math.sin(startAngle) * innerR;
      const innerX2 = cx + Math.cos(endAngle) * innerR;
      const innerY2 = cy + Math.sin(endAngle) * innerR;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const color = colors[i % colors.length];
      path.setAttribute(
        'd',
        `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${innerX2} ${innerY2} A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${innerX1} ${innerY1} Z`
      );
      path.setAttribute('fill', color);
      if (animate) {
        path.style.transform = 'scale(0)';
        path.style.transformOrigin = `${cx}px ${cy}px`;
        path.style.animation = `popIn 0.5s ease-out ${i * 0.1}s forwards`;
      }
      svg.appendChild(path);

      if (d.value / total > 0.05) {
        const labelAngle = (startAngle + endAngle) / 2;
        const labelRadius = (radius + innerR) / 2;
        const labelX = cx + Math.cos(labelAngle) * labelRadius;
        const labelY = cy + Math.sin(labelAngle) * labelRadius;

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(labelX));
        text.setAttribute('y', String(labelY));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('font-size', '12');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('fill', '#fff');
        text.textContent = `${((d.value / total) * 100).toFixed(0)}%`;
        svg.appendChild(text);
      }

      currentAngle = endAngle;
    });

    if (showLegend) {
      const legendGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      legendGroup.setAttribute('font-size', '12');
      legendGroup.setAttribute('fill', 'currentColor');

      data.forEach((d, i) => {
        const y = pad.top + i * 24;
        const color = colors[i % colors.length];

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', String(width - pad.right + 10));
        rect.setAttribute('y', String(y - 8));
        rect.setAttribute('width', '12');
        rect.setAttribute('height', '12');
        rect.setAttribute('fill', color);
        rect.setAttribute('rx', '2');
        legendGroup.appendChild(rect);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(width - pad.right + 30));
        text.setAttribute('y', String(y + 2));
        text.textContent = `${d.label} (${((d.value / total) * 100).toFixed(1)}%)`;
        legendGroup.appendChild(text);
      });
      svg.appendChild(legendGroup);
    }

    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `
      @keyframes popIn {
        to { transform: scale(1); }
      }
    `;
    svg.appendChild(style);
  }, [data, width, height, pad, innerRadius, showLegend, animate, colors]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full h-full ${className}`}
      role="img"
      aria-label="Donut chart"
    />
  );
};