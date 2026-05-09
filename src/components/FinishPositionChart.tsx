import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { SimulationOutput } from "../engine/types";

const PLACE_COLORS = ["#22C55E", "#5B8DEF", "#F59E0B", "#F87171"];

interface FinishPositionChartProps {
  output: SimulationOutput;
  playerNames: Record<string, string>;
}

export const FinishPositionChart: React.FC<FinishPositionChartProps> = ({
  output,
  playerNames,
}) => {
  const n = output.perPlayer.length;
  const places = Array.from({ length: n }, (_, i) => i + 1);

  // Build data: one bar group per place
  const data = places.map((place) => {
    const entry: Record<string, number | string> = { place: `#${place}` };
    for (const pp of output.perPlayer) {
      const name = playerNames[pp.id] ?? pp.id;
      entry[name] = parseFloat(((pp.placeMarginals[place] ?? 0) * 100).toFixed(1));
    }
    return entry;
  });

  return (
    <div role="img" aria-label="Finish position stacked bar chart">
      <h3
        style={{
          color: "#AAB6C8",
          marginBottom: 8,
          fontSize: 13,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Finish Position Marginals
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" />
          <XAxis dataKey="place" tick={{ fill: "#AAB6C8", fontSize: 12 }} />
          <YAxis
            tickFormatter={(v) => `${v}%`}
            domain={[0, 100]}
            tick={{ fill: "#AAB6C8", fontSize: 12 }}
          />
          <Tooltip
            formatter={(value, name) => [`${Number(value).toFixed(1)}%`, String(name)]}
            contentStyle={{
              background: "#121A2B",
              border: "1px solid #1E2D45",
              color: "#F8FAFC",
            }}
          />
          <Legend wrapperStyle={{ color: "#AAB6C8", fontSize: 12 }} />
          {output.perPlayer.map((pp, i) => (
            <Bar
              key={pp.id}
              dataKey={playerNames[pp.id] ?? pp.id}
              stackId="a"
              fill={PLACE_COLORS[i % PLACE_COLORS.length]}
              radius={i === output.perPlayer.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
