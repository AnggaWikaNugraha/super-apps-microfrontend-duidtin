"use client";

import { CartesianGrid, Legend, Line, LineChart as RechartsLineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { getChartColor } from "../../utils";

import type { LineChartRootProps } from "../../types/line-chart/line-chart.types";

const Root = ({ data, categoryKey, series, height = 256, showLegend = true, showGrid = true, valueFormatter, className }: LineChartRootProps) => {
  return (
    <div className={["ui-chart", className].filter(Boolean).join(" ")} data-slot="line-chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey={categoryKey} />
          <YAxis tickFormatter={valueFormatter} />
          <Tooltip formatter={(value: number) => (valueFormatter ? valueFormatter(value) : value)} />
          {showLegend && <Legend />}
          {series.map((s, i) => (
            <Line key={s.dataKey} type="monotone" dataKey={s.dataKey} name={s.name ?? s.dataKey} stroke={s.color ?? getChartColor(i)} strokeWidth={2} dot={{ r: 3 }} />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};

export { Root };
