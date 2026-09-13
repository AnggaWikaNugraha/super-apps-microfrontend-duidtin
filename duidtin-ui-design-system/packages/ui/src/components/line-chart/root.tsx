"use client";

import { CartesianGrid, Legend, Line, LineChart as RechartsLineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { getChartColor } from "../../utils";

import type { LineChartRootProps } from "../../types/line-chart/line-chart.types";

const Root = ({ data, categoryKey, series, height = 256, showLegend = true, showGrid = true, valueFormatter, className }: LineChartRootProps) => {
  return (
    <div className={["ui-chart", className].filter(Boolean).join(" ")} data-slot="line-chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data}>
          {showGrid && <CartesianGrid vertical={false} stroke="var(--dtn-line)" strokeDasharray="4 4" />}
          <XAxis dataKey={categoryKey} axisLine={false} tickLine={false} tickMargin={12} minTickGap={24} />
          <YAxis tickFormatter={valueFormatter} axisLine={false} tickLine={false} tickMargin={8} width={72} />
          <Tooltip formatter={(value: unknown) => (valueFormatter ? valueFormatter(Number(value)) : String(value))} />
          {showLegend && <Legend iconType="circle" iconSize={8} />}
          {series.map((s, i) => (
            <Line key={s.dataKey} type="monotone" dataKey={s.dataKey} name={s.name ?? s.dataKey} stroke={s.color ?? getChartColor(i)} strokeWidth={2.5} dot={false} activeDot={{ r: 5, stroke: "var(--dtn-surface)", strokeWidth: 3 }} isAnimationActive={false} />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};

export { Root };
