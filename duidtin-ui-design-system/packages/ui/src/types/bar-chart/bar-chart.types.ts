export interface BarChartSeries {
  dataKey: string;
  name?: string;
  color?: string;
}

export interface BarChartRootProps {
  data: Record<string, unknown>[];
  categoryKey: string;
  series: BarChartSeries[];
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  valueFormatter?: (value: number) => string;
  className?: string;
}
