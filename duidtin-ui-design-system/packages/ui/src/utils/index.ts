import { twMerge } from "tailwind-merge";

export function composeTwRenderProps<T>(className: string | ((renderProps: T) => string) | undefined, tw: string | ((renderProps: T) => string)): (renderProps: T) => string {
  return (renderProps: T) => {
    const resolvedClassName = typeof className === "function" ? className(renderProps) : className;
    const resolvedTw = typeof tw === "function" ? tw(renderProps) : tw;
    return twMerge(resolvedTw, resolvedClassName);
  };
}

export const CHART_COLORS = ["var(--dtn-chart-1)", "var(--dtn-chart-2)", "var(--dtn-chart-3)", "var(--dtn-chart-4)", "var(--dtn-chart-5)", "var(--dtn-chart-6)", "var(--dtn-chart-7)", "var(--dtn-chart-8)"];

export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}
