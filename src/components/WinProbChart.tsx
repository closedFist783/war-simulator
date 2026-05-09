import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ErrorBar,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { SimulationOutput } from "../engine/types";

const PLAYER_COLORS = ["#38BDF8", "#A78BFA", "#F472B6", "#34D399"];

interface WinProbChartProps {
  output: SimulationOutput;
  playerNames: Record<string, string>;
}

export const WinProbChart: React.FC<WinProbChartProps> = ({ output, playerNames }) => {
  const data = output.perPlayer.map((pp, i) => {
    const ci = pp.confidenceInterval95;
    const errorVal = ci ? (ci[1] - ci[0]) / 2 : 0;
    return {
      name: playerNames[pp.id] ?? pp.id,
      winProb: parseFloat((pp.winProbability * 100).toFixed(1)),
      errorVal: parseFloat((errorVal * 100).toFixed(1)),
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
    };
  });

  return (
    <div role="img" aria-label="Win probability bar chart">
      <h3 style={{ color: "#AAB6C8", marginBottom: 8, fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Win Probability
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" />
          <XAxis dataKey="name" tick={{ fill: "#AAB6C8", fontSize: 12 }} />
          <YAxis
            tickFormatter={(v) => `${v}%`}
            domain={[0, 100]}
            tick={{ fill: "#AAB6C8", fontSize: 12 }}
          />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(1)}%`, "Win Probability"]}
            contentStyle={{ background: "#121A2B", border: "1px solid #1E2D45", color: "#F8FAFC" }}
          />
          <Bar dataKey="winProb" name="Win Probability" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
            <ErrorBar dataKey="errorVal" width={4} strokeWidth={2} stroke="#F8FAFC" opacity={0.7} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
