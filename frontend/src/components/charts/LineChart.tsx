import React, { useRef, useEffect, useMemo, memo } from 'react';
import type { ChartSeries, ChartConfig } from './types';

interface LineChartProps {
  series: ChartSeries[];
  config?: ChartConfig;
  className?: string;
}

const DEFAULT_PADDING = { top: 20, right: 20, bottom: 40, left: 50 };

const DEFAULT_COLORS = [
  'var(--color-primary)',
  'var(--color-secondary)',
  'var(--color-accent)',
  'var(--color-primary-light)',
  'var(--color-secondary-light)',
  '#ff7b00',
];

const LineChartImpl: React.FC<LineChartProps> = ({
  series,
  config = {},
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const {
    width = 600,
    height = 300,
    padding = DEFAULT_PADDING,
    showGrid = true,
    showLabels = true,
    showPoints = true,
    showArea = false,
    animate = true,
    colors = DEFAULT_COLORS,
  } = config;

  const pad = useMemo(
    () => ({ top: padding.top, right: padding.right, bottom: padding.bottom, left: padding.left }),
    [padding]
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || series.length === 0) return;

    const chartWidth = width - pad.left - pad.right;
    const chartHeight = height - pad.top - pad.bottom;

    const allValues = series.flatMap((s) => s.data.map((d) => d.value));
    const maxValue = Math.max(...allValues, 1);
    const minValue = Math.min(...allValues, 0);

    const xScale = (index: number) =>
      pad.left + (index / Math.max(1, series[0].data.length - 1)) * chartWidth;

    const yScale = (value: number) =>
      pad.top + chartHeight - ((value - minValue) / (maxValue - minValue || 1)) * chartHeight;

    svg.innerHTML = '';

    if (showGrid) {
      const gridLines = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      gridLines.setAttribute('stroke', 'currentColor');
      gridLines.setAttribute('stroke-opacity', '0.1');
      gridLines.setAttribute('stroke-dasharray', '4 4');

      for (let i = 0; i <= 4; i++) {
        const y = pad.top + (chartHeight / 4) * i;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(pad.left));
        line.setAttribute('x2', String(width - pad.right));
        line.setAttribute('y1', String(y));
        line.setAttribute('y2', String(y));
        gridLines.appendChild(line);
      }

      for (let i = 0; i < series[0].data.length; i++) {
        const x = xScale(i);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(x));
        line.setAttribute('x2', String(x));
        line.setAttribute('y1', String(pad.top));
        line.setAttribute('y2', String(height - pad.bottom));
        gridLines.appendChild(line);
      }
      svg.appendChild(gridLines);
    }

    series.forEach((seriesItem, seriesIndex) => {
      const color = seriesItem.color || colors[seriesIndex % colors.length];
      const points = seriesItem.data.map((d, i) => ({
        x: xScale(i),
        y: yScale(d.value),
      }));

      if (showArea) {
        const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        let d = `M ${points[0].x} ${height - pad.bottom}`;
        points.forEach((p) => {
          d += ` L ${p.x} ${p.y}`;
        });
        d += ` L ${points[points.length - 1].x} ${height - pad.bottom} Z`;
        areaPath.setAttribute('d', d);
        areaPath.setAttribute('fill', color);
        areaPath.setAttribute('opacity', '0.1');
        svg.appendChild(areaPath);
      }

      const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      let pathData = `M ${points[0].x} ${points[0].y}`;
      points.slice(1).forEach((p) => {
        pathData += ` L ${p.x} ${p.y}`;
      });
      linePath.setAttribute('d', pathData);
      linePath.setAttribute('stroke', color);
      linePath.setAttribute('stroke-width', '2.5');
      linePath.setAttribute('fill', 'none');
      linePath.setAttribute('stroke-linecap', 'round');
      linePath.setAttribute('stroke-linejoin', 'round');
      if (animate) {
        linePath.style.strokeDasharray = String(linePath.getTotalLength());
        linePath.style.strokeDashoffset = String(linePath.getTotalLength());
        linePath.style.animation = 'dash 1s ease-out forwards';
      }
      svg.appendChild(linePath);

      if (showPoints) {
        points.forEach((p, i) => {
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', String(p.x));
          circle.setAttribute('cy', String(p.y));
          circle.setAttribute('r', '4');
          circle.setAttribute('fill', color);
          circle.setAttribute('stroke', '#fff');
          circle.setAttribute('stroke-width', '2');
          if (animate) {
            circle.style.opacity = '0';
            circle.style.animation = `popIn 0.3s ease-out ${0.3 + i * 0.1}s forwards`;
          }
          svg.appendChild(circle);
        });
      }
    });

    if (showLabels) {
      const labelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      labelsGroup.setAttribute('font-size', '11');
      labelsGroup.setAttribute('fill', 'currentColor');
      labelsGroup.setAttribute('opacity', '0.6');
      labelsGroup.setAttribute('text-anchor', 'middle');

      series[0].data.forEach((d, i) => {
        const x = xScale(i);
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(x));
        text.setAttribute('y', String(height - pad.bottom + 16));
        text.textContent = d.label;
        labelsGroup.appendChild(text);
      });
      svg.appendChild(labelsGroup);
    }

    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `
      @keyframes dash {
        to { stroke-dashoffset: 0; }
      }
      @keyframes popIn {
        to { opacity: 1; }
      }
    `;
    svg.appendChild(style);
  }, [series, width, height, pad, showGrid, showLabels, showPoints, showArea, animate, colors]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full h-full ${className}`}
      role="img"
      aria-label="Line chart"
    />
  );
};

export const LineChart = memo(LineChartImpl);