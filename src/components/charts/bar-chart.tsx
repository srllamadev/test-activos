"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface BarDatum {
  label: string;
  value: number;
  /** Porcentaje opcional mostrado en el tooltip */
  pct?: number | null;
  /** Color: solo colores oficiales o sus variaciones de transparencia */
  color?: string;
}

/** Paleta institucional: Midnight Navy, Coral Orange y variaciones de transparencia. */
export const CHART_COLORS = {
  navy: "#002941",
  navyMid: "rgba(0, 41, 65, 0.6)",
  navyLight: "rgba(0, 41, 65, 0.35)",
  coral: "#FD6E6E",
};

export function BarChartPanel({
  data,
  orientation = "horizontal",
  ariaLabel,
  valueLabel = "Registros",
}: {
  data: BarDatum[];
  orientation?: "horizontal" | "vertical";
  ariaLabel: string;
  valueLabel?: string;
}) {
  const height = Math.max(180, data.length * 42 + 40);
  const isHorizontal = orientation === "horizontal";

  return (
    <div className="flex flex-col gap-3">
      <div style={{ width: "100%", height }} role="img" aria-label={`${ariaLabel}: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            layout={isHorizontal ? "vertical" : "horizontal"}
            margin={{ top: 8, right: 40, bottom: 4, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 41, 65, 0.12)" horizontal={!isHorizontal} vertical={isHorizontal} />
            {isHorizontal ? (
              <>
                <XAxis type="number" allowDecimals={false} tick={{ fill: CHART_COLORS.navy, fontSize: 12 }} />
                <YAxis type="category" dataKey="label" width={170} tick={{ fill: CHART_COLORS.navy, fontSize: 12 }} />
              </>
            ) : (
              <>
                <XAxis dataKey="label" tick={{ fill: CHART_COLORS.navy, fontSize: 12 }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fill: CHART_COLORS.navy, fontSize: 12 }} />
              </>
            )}
            <Tooltip
              cursor={{ fill: "rgba(0, 41, 65, 0.06)" }}
              contentStyle={{ backgroundColor: "#ffffff", border: "1px solid rgba(0,41,65,0.2)", borderRadius: 12, color: CHART_COLORS.navy }}
              formatter={(value, _name, item) => {
                const pct = (item?.payload as BarDatum | undefined)?.pct;
                return [`${value}${pct !== null && pct !== undefined ? ` (${pct}%)` : ""}`, valueLabel];
              }}
            />
            <Bar dataKey="value" radius={6} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.label} fill={d.color ?? CHART_COLORS.navy} />
              ))}
              <LabelList dataKey="value" position={isHorizontal ? "right" : "top"} fill={CHART_COLORS.navy} fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Alternativa textual accesible con los mismos valores */}
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Categoría</th>
            <th scope="col">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <td>{d.label}</td>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
