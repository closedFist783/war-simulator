import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { SimulationOutput } from "../engine/types";

interface RoundsDistChartProps {
  output: SimulationOutput;
}

export const RoundsDistChart: React.FC<RoundsDistChartProps> = ({ output }) => {
  const dist = output.remainingRoundsDistribution;
  const histogram = dist.histogram ?? [];

  const data = histogram.map((bucket) => ({
    label: `${bucket.bucketStart}-${bucket.bucketEnd}`,
    start: bucket.bucketStart,
    probability: parseFloat((bucket.probability * 100).toFixed(2)),
  }));

  if (data.length === 0) {
    // Fallback: show single bar
    data.push({ label: `${dist.mean.toFixed(0)}`, start: dist.mean, probability: 100 });
  }

  return (
    <div role="img" aria-label="Remaining rounds distribution histogram">
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
        Rounds Distribution
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#AAB6C8", fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: "#AAB6C8", fontSize: 12 }}
          />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(2)}%`, "Probability"]}
            contentStyle={{
              background: "#121A2B",
              border: "1px solid #1E2D45",
              color: "#F8FAFC",
            }}
          />
          <Bar dataKey="probability" fill="#5B8DEF" radius={[2, 2, 0, 0]} name="Probability" />
          {dist.mean !== undefined && (
            <ReferenceLine
              x={data.reduce((closest, d) => {
                return Math.abs(d.start - dist.mean) < Math.abs(closest.start - dist.mean)
                  ? d
                  : closest;
              }, data[0])?.label}
              stroke="#F59E0B"
              strokeDasharray="4 2"
              label={{ value: "μ", fill: "#F59E0B", fontSize: 12 }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
        <Stat label="Mean" value={dist.mean.toFixed(0)} />
        {dist.median !== undefined && <Stat label="Median" value={dist.median.toFixed(0)} />}
        {dist.p10 !== undefined && <Stat label="P10" value={dist.p10.toFixed(0)} />}
        {dist.p90 !== undefined && <Stat label="P90" value={dist.p90.toFixed(0)} />}
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ textAlign: "center" }}>
    <div style={{ color: "#AAB6C8", fontSize: 11, textTransform: "uppercase" }}>{label}</div>
    <div style={{ color: "#F8FAFC", fontSize: 16, fontWeight: 700 }}>{value}</div>
  </div>
);
