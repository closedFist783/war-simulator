import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  ResponsiveContainer,
} from "recharts";
import type { SimulationOutput } from "../engine/types";

const PLAYER_COLORS = ["#38BDF8", "#A78BFA", "#F472B6", "#34D399"];

interface DeltaChartProps {
  output: SimulationOutput;
  playerNames: Record<string, string>;
}

export const DeltaChart: React.FC<DeltaChartProps> = ({ output, playerNames }) => {
  const hasDeltas = output.perPlayer.some((pp) => pp.deltaFromLastEvent !== undefined);

  const data = output.perPlayer.map((pp, i) => ({
    name: playerNames[pp.id] ?? pp.id,
    delta: parseFloat(((pp.deltaFromLastEvent ?? 0) * 100).toFixed(2)),
    color:
      (pp.deltaFromLastEvent ?? 0) >= 0
        ? "#22C55E"
        : "#F87171",
    playerColor: PLAYER_COLORS[i % PLAYER_COLORS.length],
  }));

  if (!hasDeltas) {
    return (
      <div role="img" aria-label="Delta waterfall chart">
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
          Δ Win% from Last Event
        </h3>
        <div
          style={{
            height: 220,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#AAB6C8",
            fontSize: 14,
          }}
        >
          Run analysis twice to see deltas
        </div>
      </div>
    );
  }

  return (
    <div role="img" aria-label="Delta waterfall chart">
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
        Δ Win% from Last Event
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" />
          <XAxis dataKey="name" tick={{ fill: "#AAB6C8", fontSize: 12 }} />
          <YAxis
            tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`}
            tick={{ fill: "#AAB6C8", fontSize: 12 }}
          />
          <ReferenceLine y={0} stroke="#AAB6C8" strokeWidth={1} />
          <Tooltip
            formatter={(value) => [
              `${Number(value) > 0 ? "+" : ""}${Number(value).toFixed(2)}%`,
              "Δ Win%",
            ]}
            contentStyle={{
              background: "#121A2B",
              border: "1px solid #1E2D45",
              color: "#F8FAFC",
            }}
          />
          <Bar dataKey="delta" name="Δ Win%" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
