export interface ChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
}

export interface ChartConfig {
  width?: number;
  height?: number;
  padding?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  showGrid?: boolean;
  showLabels?: boolean;
  showPoints?: boolean;
  showArea?: boolean;
  animate?: boolean;
  colors?: string[];
}