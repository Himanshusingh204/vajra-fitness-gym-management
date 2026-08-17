import React, { useRef, useEffect, useMemo, useCallback, memo } from 'react';
import type { ChartSeries, ChartConfig } from './types';

interface BarChartProps {
  series: ChartSeries[];
  config?: ChartConfig;
  className?: string;
  horizontal?: boolean;
  grouped?: boolean;
}

const DEFAULT_PADDING = { top: 20, right: 20, bottom: 60, left: 50 };

const DEFAULT_COLORS = [
  'var(--color-primary)',
  'var(--color-secondary)',
  'var(--color-accent)',
  'var(--color-primary-light)',
  'var(--color-secondary-light)',
  '#ff7b00',
];

const BarChartImpl: React.FC<BarChartProps> = ({
  series,
  config = {},
  className = '',
  horizontal = false,
  grouped = false,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const {
    width = 600,
    height = 300,
    padding = DEFAULT_PADDING,
    showGrid = true,
    showLabels = true,
    animate = true,
    colors = DEFAULT_COLORS,
  } = config;

  const pad = useMemo(
    () => ({ top: padding.top, right: padding.right, bottom: padding.bottom, left: padding.left }),
    [padding]
  );

  const renderVertical = useCallback(
    (
      svg: SVGSVGElement,
      chartWidth: number,
      chartHeight: number,
      maxValue: number
    ) => {
      const xScale = (index: number) =>
        pad.left + (index / Math.max(1, series[0].data.length - 1)) * chartWidth;

      const yScale = (value: number) =>
        pad.top + chartHeight - (value / maxValue) * chartHeight;

      const barWidth = grouped
        ? chartWidth / series[0].data.length / series.length * 0.8
        : chartWidth / series[0].data.length * 0.6;

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
        svg.appendChild(gridLines);
      }

      series.forEach((seriesItem, seriesIndex) => {
        const color = seriesItem.color || colors[seriesIndex % colors.length];

        seriesItem.data.forEach((d, i) => {
          const x = xScale(i);
          const y = yScale(d.value);
          const barHeight = (d.value / maxValue) * chartHeight;

          const barX = grouped
            ? x - (barWidth * series.length) / 2 + seriesIndex * barWidth
            : x - barWidth / 2;

          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', String(barX));
          rect.setAttribute('y', String(y));
          rect.setAttribute('width', String(barWidth));
          rect.setAttribute('height', String(barHeight));
          rect.setAttribute('fill', color);
          rect.setAttribute('rx', '4');
          rect.setAttribute('ry', '4');
          if (animate) {
            rect.style.transform = 'scaleY(0)';
            rect.style.transformOrigin = 'bottom';
            rect.style.animation = `grow 0.5s ease-out ${seriesIndex * 0.1 + i * 0.05}s forwards`;
          }
          svg.appendChild(rect);

          if (showLabels && d.value > 0) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', String(barX + barWidth / 2));
            text.setAttribute('y', String(y - 4));
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '11');
            text.setAttribute('fill', 'currentColor');
            text.setAttribute('opacity', '0.7');
            text.textContent = d.value >= 1000 ? (d.value / 1000).toFixed(1) + 'k' : String(d.value);
            svg.appendChild(text);
          }
        });
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
        @keyframes grow {
          to { transform: scaleY(1); }
        }
      `;
      svg.appendChild(style);
    },
    [pad, width, height, series, grouped, colors, showGrid, showLabels, animate]
  );

  const renderHorizontal = useCallback(
    (
      svg: SVGSVGElement,
      chartWidth: number,
      chartHeight: number,
      maxValue: number
    ) => {
      const yScale = (index: number) =>
        pad.top + (index / Math.max(1, series[0].data.length - 1)) * chartHeight;

      const barHeight = grouped
        ? chartHeight / series[0].data.length / series.length * 0.8
        : chartHeight / series[0].data.length * 0.6;

      svg.innerHTML = '';

      if (showGrid) {
        const gridLines = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        gridLines.setAttribute('stroke', 'currentColor');
        gridLines.setAttribute('stroke-opacity', '0.1');
        gridLines.setAttribute('stroke-dasharray', '4 4');

        for (let i = 0; i <= 4; i++) {
          const x = pad.left + (chartWidth / 4) * i;
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

        seriesItem.data.forEach((d, i) => {
          const y = yScale(i);
          const barWidth = (d.value / maxValue) * chartWidth;

          const barY = grouped
            ? y - (barHeight * series.length) / 2 + seriesIndex * barHeight
            : y - barHeight / 2;

          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', String(pad.left));
          rect.setAttribute('y', String(barY));
          rect.setAttribute('width', String(barWidth));
          rect.setAttribute('height', String(barHeight));
          rect.setAttribute('fill', color);
          rect.setAttribute('rx', '4');
          rect.setAttribute('ry', '4');
          if (animate) {
            rect.style.transform = 'scaleX(0)';
            rect.style.transformOrigin = 'left';
            rect.style.animation = `growH 0.5s ease-out ${seriesIndex * 0.1 + i * 0.05}s forwards`;
          }
          svg.appendChild(rect);
        });
      });

      if (showLabels) {
        const labelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        labelsGroup.setAttribute('font-size', '11');
        labelsGroup.setAttribute('fill', 'currentColor');
        labelsGroup.setAttribute('opacity', '0.6');
        labelsGroup.setAttribute('text-anchor', 'end');
        labelsGroup.setAttribute('dominant-baseline', 'middle');

        series[0].data.forEach((d, i) => {
          const y = yScale(i) + barHeight / 2;
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', String(pad.left - 8));
          text.setAttribute('y', String(y));
          text.textContent = d.label;
          labelsGroup.appendChild(text);
        });
        svg.appendChild(labelsGroup);
      }

      const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      style.textContent = `
        @keyframes growH {
          to { transform: scaleX(1); }
        }
      `;
      svg.appendChild(style);
    },
    [pad, height, series, grouped, colors, showGrid, animate, showLabels]
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || series.length === 0) return;

    const chartWidth = width - pad.left - pad.right;
    const chartHeight = height - pad.top - pad.bottom;

    const allValues = series.flatMap((s) => s.data.map((d) => d.value));
    const maxValue = Math.max(...allValues, 1);

    if (horizontal) {
      renderHorizontal(svg, chartWidth, chartHeight, maxValue);
    } else {
      renderVertical(svg, chartWidth, chartHeight, maxValue);
    }
  }, [series, width, height, pad, horizontal, renderVertical, renderHorizontal]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full h-full ${className}`}
      role="img"
      aria-label="Bar chart"
    />
  );
};

export const BarChart = memo(BarChartImpl);