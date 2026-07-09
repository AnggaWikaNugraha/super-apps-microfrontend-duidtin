export interface PieChartDatum {
  name: string;
  value: number;
  color?: string;
}

export interface PieChartRootProps {
  data: PieChartDatum[];
  height?: number;
  showLegend?: boolean;
  valueFormatter?: (value: number) => string;
  className?: string;
  innerRadius?: number;
}
