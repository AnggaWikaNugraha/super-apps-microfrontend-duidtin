"use client";

import { Bar, BarChart as RechartsBarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { getChartColor } from "../../utils";

import type { BarChartRootProps } from "../../types/bar-chart/bar-chart.types";

const Root = ({ data, categoryKey, series, height = 256, showLegend = true, showGrid = true, valueFormatter, className }: BarChartRootProps) => {
  return (
    <div className={["ui-chart", className].filter(Boolean).join(" ")} data-slot="bar-chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey={categoryKey} />
          <YAxis tickFormatter={valueFormatter} />
          <Tooltip formatter={(value: number) => (valueFormatter ? valueFormatter(value) : value)} />
          {showLegend && <Legend />}
          {series.map((s, i) => (
            <Bar key={s.dataKey} dataKey={s.dataKey} name={s.name ?? s.dataKey} fill={s.color ?? getChartColor(i)} radius={[4, 4, 0, 0]} />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export { Root };
