export interface LineChartSeries {
  dataKey: string;
  name?: string;
  color?: string;
}

export interface LineChartRootProps {
  data: Record<string, unknown>[];
  categoryKey: string;
  series: LineChartSeries[];
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  valueFormatter?: (value: number) => string;
  className?: string;
}
