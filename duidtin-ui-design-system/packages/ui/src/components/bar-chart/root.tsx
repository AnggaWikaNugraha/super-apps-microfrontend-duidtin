"use client";

import { Bar, BarChart as RechartsBarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { getChartColor } from "../../utils";

import type { BarChartRootProps } from "../../types/bar-chart/bar-chart.types";

const Root = ({ data, categoryKey, series, height = 256, showLegend = true, showGrid = true, valueFormatter, className }: BarChartRootProps) => {
  return (
    <div className={["ui-chart", className].filter(Boolean).join(" ")} data-slot="bar-chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data}>
          {showGrid && <CartesianGrid vertical={false} stroke="var(--dtn-line)" strokeDasharray="4 4" />}
          <XAxis dataKey={categoryKey} axisLine={false} tickLine={false} tickMargin={12} minTickGap={24} />
          <YAxis tickFormatter={valueFormatter} axisLine={false} tickLine={false} tickMargin={8} width={72} />
          <Tooltip cursor={{ fill: "var(--dtn-surface-muted)" }} formatter={(value: unknown) => (valueFormatter ? valueFormatter(Number(value)) : String(value))} />
          {showLegend && <Legend iconType="circle" iconSize={8} />}
          {series.map((s, i) => (
            <Bar key={s.dataKey} dataKey={s.dataKey} name={s.name ?? s.dataKey} fill={s.color ?? getChartColor(i)} radius={[5, 5, 0, 0]} maxBarSize={40} isAnimationActive={false} />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export { Root };
