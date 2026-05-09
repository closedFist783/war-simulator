import React from "react";
import type { SimulationOutput } from "../engine/types";

interface DiagnosticsPanelProps {
  output: SimulationOutput;
  playerNames: Record<string, string>;
}

const PLAYER_COLORS = ["#38BDF8", "#A78BFA", "#F472B6", "#34D399"];

export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({
  output,
  playerNames,
}) => {
  const d = output.diagnostics;

  return (
    <div>
      <h3
        style={{
          color: "#AAB6C8",
          marginBottom: 12,
          fontSize: 13,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Diagnostics
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <DiagStat
          label="Solver Mode"
          value={output.solverModeUsed.toUpperCase()}
          color={
            output.solverModeUsed === "exact"
              ? "#22C55E"
              : output.solverModeUsed === "simulation"
              ? "#5B8DEF"
              : "#F59E0B"
          }
        />
        <DiagStat
          label="Loop Detected"
          value={output.loopDetected ? "YES" : "NO"}
          color={output.loopDetected ? "#F87171" : "#22C55E"}
        />
        {d.latentOrderCountEstimate !== undefined && (
          <DiagStat
            label="Latent Orders"
            value={formatNumber(d.latentOrderCountEstimate)}
          />
        )}
        {d.monteCarloRunsUsed !== undefined && (
          <DiagStat label="MC Runs" value={d.monteCarloRunsUsed.toLocaleString()} />
        )}
        {d.maxWarDepthObserved !== undefined && (
          <DiagStat label="Max War Depth" value={String(d.maxWarDepthObserved)} />
        )}
        {output.terminationProbability !== undefined && (
          <DiagStat
            label="Term. Prob."
            value={`${(output.terminationProbability * 100).toFixed(1)}%`}
          />
        )}
      </div>

      <h3
        style={{
          color: "#AAB6C8",
          marginBottom: 10,
          fontSize: 13,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Expected Rounds
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {output.perPlayer.map((pp, i) => {
          const ci = pp.expectedRemainingRoundsCI95;
          return (
            <div
              key={pp.id}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span style={{ color: PLAYER_COLORS[i % PLAYER_COLORS.length], fontWeight: 600, fontSize: 13 }}>
                {playerNames[pp.id] ?? pp.id}
              </span>
              <span style={{ color: "#F8FAFC", fontSize: 13 }}>
                {pp.expectedRemainingRounds.toFixed(0)} rounds
                {ci && (
                  <span style={{ color: "#AAB6C8", fontSize: 11, marginLeft: 6 }}>
                    [{ci[0].toFixed(0)}–{ci[1].toFixed(0)}]
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {output.finishOrderProbabilities && output.finishOrderProbabilities.length > 0 && (
        <>
          <h3
            style={{
              color: "#AAB6C8",
              margin: "16px 0 10px",
              fontSize: 13,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Top Finish Orders
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {output.finishOrderProbabilities.slice(0, 5).map((fo, i) => (
              <div
                key={i}
                style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}
              >
                <span style={{ color: "#AAB6C8" }}>
                  {fo.finishOrder.map((id) => playerNames[id] ?? id).join(" → ")}
                </span>
                <span style={{ color: "#F8FAFC", fontWeight: 600 }}>
                  {(fo.probability * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const DiagStat: React.FC<{ label: string; value: string; color?: string }> = ({
  label,
  value,
  color = "#F8FAFC",
}) => (
  <div
    style={{
      background: "#0B1020",
      borderRadius: 6,
      padding: "8px 12px",
      border: "1px solid #1E2D45",
    }}
  >
    <div style={{ color: "#AAB6C8", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {label}
    </div>
    <div style={{ color, fontSize: 14, fontWeight: 700, marginTop: 2 }}>{value}</div>
  </div>
);

function formatNumber(n: number): string {
  if (n > 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n > 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n > 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n > 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}
