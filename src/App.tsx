import { useState, useCallback, useRef } from "react";
import type { PlayerStateInput, RuleConfig, SolverConfig, SimulationOutput, RankCounts } from "./engine/types";
import { validateGameState } from "./engine/validator";
import { runSolver, applyDeltas } from "./solver";
import { InputPanel } from "./components/InputPanel";
import { ResultsPanel } from "./components/ResultsPanel";

const DEFAULT_RANKS = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];
function makeDefaultRankCounts(handSize: number): RankCounts {
  const rc: RankCounts = {};
  for (const r of DEFAULT_RANKS) rc[r] = 0;
  // Distribute as evenly as possible
  let remaining = handSize;
  let i = 0;
  while (remaining > 0) {
    const rank = DEFAULT_RANKS[i % DEFAULT_RANKS.length];
    rc[rank]++;
    remaining--;
    i++;
  }
  return rc;
}

function makeDefaultPlayers(count: number, deckSize: number): PlayerStateInput[] {
  const playerLabels = ["A", "B", "C", "D"];
  const baseSize = Math.floor(deckSize / count);
  const remainder = deckSize % count;
  return Array.from({ length: count }, (_, i) => {
    const handSize = baseSize + (i < remainder ? 1 : 0);
    return {
      id: `player${i + 1}`,
      displayName: `Player ${playerLabels[i]}`,
      handSize,
      orderMode: "randomized-fixed" as const,
      rankCounts: makeDefaultRankCounts(handSize),
    };
  });
}

const DEFAULT_RULES: RuleConfig = {
  playerCount: 2,
  deckSize: 52,
  rankOrderHighToLow: DEFAULT_RANKS,
  warParticipantsPolicy: "tied_only",
  warDepthMode: "recursive",
  faceDownSchedulePerWarLevel: [3],
  captureOrderPolicy: "winner_first",
  insufficientCardsPolicy: "immediate_loss",
  orderedOrRandomizedDefault: "randomized-fixed",
};

const DEFAULT_SOLVER: SolverConfig = {
  mode: "auto",
  exactLatentThreshold: 50000,
  maxReachableStateThreshold: 100000,
  monteCarloRuns: 2000,
  monteCarloSeed: 42,
  targetHalfWidth95: 0.02,
  maxMonteCarloRuns: 10000,
  roundCap: 10000,
};

export default function App() {
  const [players, setPlayers] = useState<PlayerStateInput[]>(
    makeDefaultPlayers(2, 52)
  );
  const [rules, setRules] = useState<RuleConfig>(DEFAULT_RULES);
  const [solverConfig, setSolverConfig] = useState<SolverConfig>(DEFAULT_SOLVER);
  const [output, setOutput] = useState<SimulationOutput | null>(null);
  const [running, setRunning] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const previousOutput = useRef<SimulationOutput | null>(null);

  const playerNames: Record<string, string> = Object.fromEntries(
    players.map((p) => [p.id, p.displayName])
  );

  const handleRun = useCallback(async () => {
    // Validate
    const visible = {
      potCards: [],
      currentBattleCards: {},
      revealedHistory: [],
    };
    const validation = validateGameState(players, visible, rules);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors([]);
    setRunning(true);

    try {
      // Run in next tick to allow React to update UI
      await new Promise((resolve) => setTimeout(resolve, 10));
      const result = await runSolver(players, rules, solverConfig);
      const withDeltas = applyDeltas(result, previousOutput.current);
      previousOutput.current = withDeltas;
      setOutput(withDeltas);
    } catch (err) {
      setErrors([String(err)]);
    } finally {
      setRunning(false);
    }
  }, [players, rules, solverConfig]);

  const solverBadgeColor =
    output?.solverModeUsed === "exact"
      ? "#22C55E"
      : output?.solverModeUsed === "simulation"
      ? "#5B8DEF"
      : "#F59E0B";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0B1020",
        color: "#F8FAFC",
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          background: "#121A2B",
          borderBottom: "1px solid #1E2D45",
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <span style={{ fontSize: 22 }}>🃏</span>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "#F8FAFC",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          War Simulator
        </h1>
        <span style={{ color: "#AAB6C8", fontSize: 12 }}>Probabilistic Analysis</span>
        {output && (
          <span
            style={{
              marginLeft: "auto",
              background: "#0B1020",
              border: `1px solid ${solverBadgeColor}`,
              color: solverBadgeColor,
              borderRadius: 20,
              padding: "2px 10px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
            aria-label={`Solver mode: ${output.solverModeUsed}`}
          >
            {output.solverModeUsed === "exact"
              ? "EXACT"
              : output.solverModeUsed === "simulation"
              ? "MONTE CARLO"
              : "HYBRID"}
          </span>
        )}
      </header>

      {/* Errors */}
      {errors.length > 0 && (
        <div
          role="alert"
          style={{
            background: "#2A1A1A",
            border: "1px solid #F87171",
            borderRadius: 6,
            padding: "10px 16px",
            margin: "12px 24px 0",
            color: "#F87171",
            fontSize: 13,
          }}
        >
          <strong>Validation errors:</strong>
          <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main layout */}
      <main
        style={{
          display: "grid",
          gridTemplateColumns: "380px 1fr",
          gap: 0,
          minHeight: "calc(100vh - 56px)",
        }}
      >
        {/* Left panel */}
        <aside
          style={{
            background: "#0B1020",
            borderRight: "1px solid #1E2D45",
            padding: 16,
            overflowY: "auto",
            maxHeight: "calc(100vh - 56px)",
          }}
        >
          <InputPanel
            players={players}
            rules={rules}
            solverConfig={solverConfig}
            onPlayersChange={setPlayers}
            onRulesChange={setRules}
            onSolverConfigChange={setSolverConfig}
            onRun={handleRun}
            running={running}
          />
        </aside>

        {/* Right panel */}
        <section
          style={{
            padding: 16,
            overflowY: "auto",
            maxHeight: "calc(100vh - 56px)",
          }}
          aria-live="polite"
        >
          <ResultsPanel
            output={output}
            playerNames={playerNames}
            running={running}
          />
        </section>
      </main>
    </div>
  );
}
