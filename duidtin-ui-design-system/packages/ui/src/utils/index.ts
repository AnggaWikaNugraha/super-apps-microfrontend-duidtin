import { twMerge } from "tailwind-merge";

export function composeTwRenderProps<T>(className: string | ((renderProps: T) => string) | undefined, tw: string | ((renderProps: T) => string)): (renderProps: T) => string {
  return (renderProps: T) => {
    const resolvedClassName = typeof className === "function" ? className(renderProps) : className;
    const resolvedTw = typeof tw === "function" ? tw(renderProps) : tw;
    return twMerge(resolvedTw, resolvedClassName);
  };
}

export const CHART_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#0284c7", "#7c3aed", "#db2777", "#65a30d"];

export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}
