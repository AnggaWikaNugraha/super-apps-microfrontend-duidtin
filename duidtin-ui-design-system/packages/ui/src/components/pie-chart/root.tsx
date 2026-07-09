"use client";

import { Cell, Legend, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip } from "recharts";

import { getChartColor } from "../../utils";

import type { PieChartRootProps } from "../../types/pie-chart/pie-chart.types";

const Root = ({ data, height = 256, showLegend = true, valueFormatter, className, innerRadius = 0 }: PieChartRootProps) => {
  return (
    <div className={["ui-chart", className].filter(Boolean).join(" ")} data-slot="pie-chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Tooltip formatter={(value: number) => (valueFormatter ? valueFormatter(value) : value)} />
          {showLegend && <Legend />}
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={innerRadius} outerRadius="80%">
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={entry.color ?? getChartColor(i)} />
            ))}
          </Pie>
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};

export { Root };
