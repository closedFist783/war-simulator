import React from "react";
import type { SimulationOutput } from "../engine/types";
import { WinProbChart } from "./WinProbChart";
import { FinishPositionChart } from "./FinishPositionChart";
import { RoundsDistChart } from "./RoundsDistChart";
import { DeltaChart } from "./DeltaChart";
import { DiagnosticsPanel } from "./DiagnosticsPanel";

interface ResultsPanelProps {
  output: SimulationOutput | null;
  playerNames: Record<string, string>;
  running: boolean;
}

const sectionStyle: React.CSSProperties = {
  background: "#121A2B",
  borderRadius: 8,
  padding: 16,
  marginBottom: 12,
  border: "1px solid #1E2D45",
};

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  output,
  playerNames,
  running,
}) => {
  if (running) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 400,
          color: "#5B8DEF",
          fontSize: 16,
        }}
        role="status"
        aria-live="polite"
      >
        <span>⚙️ Running analysis…</span>
      </div>
    );
  }

  if (!output) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 400,
          color: "#AAB6C8",
          fontSize: 14,
          flexDirection: "column",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 32 }}>🃏</span>
        <span>Configure the game and click Run Analysis</span>
      </div>
    );
  }

  return (
    <div>
      <div style={sectionStyle}>
        <WinProbChart output={output} playerNames={playerNames} />
      </div>
      <div style={sectionStyle}>
        <FinishPositionChart output={output} playerNames={playerNames} />
      </div>
      <div style={sectionStyle}>
        <RoundsDistChart output={output} />
      </div>
      <div style={sectionStyle}>
        <DeltaChart output={output} playerNames={playerNames} />
      </div>
      <div style={sectionStyle}>
        <DiagnosticsPanel output={output} playerNames={playerNames} />
      </div>
    </div>
  );
};
