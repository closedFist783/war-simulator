import React from "react";
import type { PlayerStateInput, RuleConfig, SolverConfig, RankCounts, OrderMode } from "../engine/types";

const DEFAULT_RANKS = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];

interface InputPanelProps {
  players: PlayerStateInput[];
  rules: RuleConfig;
  solverConfig: SolverConfig;
  onPlayersChange: (p: PlayerStateInput[]) => void;
  onRulesChange: (r: RuleConfig) => void;
  onSolverConfigChange: (s: SolverConfig) => void;
  onRun: () => void;
  running: boolean;
}

const sectionStyle: React.CSSProperties = {
  background: "#121A2B",
  borderRadius: 8,
  padding: 16,
  marginBottom: 12,
  border: "1px solid #1E2D45",
};

const labelStyle: React.CSSProperties = {
  color: "#AAB6C8",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 4,
  display: "block",
};

const inputStyle: React.CSSProperties = {
  background: "#0B1020",
  border: "1px solid #1E2D45",
  borderRadius: 4,
  color: "#F8FAFC",
  padding: "4px 8px",
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = { ...inputStyle };

const PLAYER_COLORS = ["#38BDF8", "#A78BFA", "#F472B6", "#34D399"];
const PLAYER_LABELS = ["A", "B", "C", "D"];

export const InputPanel: React.FC<InputPanelProps> = ({
  players,
  rules,
  solverConfig,
  onPlayersChange,
  onRulesChange,
  onSolverConfigChange,
  onRun,
  running,
}) => {
  const setPlayerCount = (count: number) => {
    const newPlayers = Array.from({ length: count }, (_, i) => {
      const existing = players[i];
      if (existing) return existing;
      const cardsPerPlayer = Math.floor(rules.deckSize / count);
      const rankCounts: RankCounts = {};
      for (const rank of DEFAULT_RANKS) rankCounts[rank] = 0;
      // Distribute cards evenly
      let remaining = cardsPerPlayer;
      for (const rank of DEFAULT_RANKS) {
        if (remaining <= 0) break;
        rankCounts[rank] = 4;
        remaining -= 4;
      }
      return {
        id: `player${i + 1}`,
        displayName: `Player ${PLAYER_LABELS[i]}`,
        handSize: cardsPerPlayer,
        orderMode: "randomized-fixed" as OrderMode,
        rankCounts,
      };
    });
    onPlayersChange(newPlayers);
    onRulesChange({ ...rules, playerCount: count });
  };

  const updatePlayer = (i: number, updates: Partial<PlayerStateInput>) => {
    const newPlayers = players.map((p, idx) =>
      idx === i ? { ...p, ...updates } : p
    );
    onPlayersChange(newPlayers);
  };

  const updateRankCount = (playerIdx: number, rank: string, val: number) => {
    const p = players[playerIdx];
    const newRankCounts = { ...p.rankCounts, [rank]: Math.max(0, val) };
    const newHandSize = Object.values(newRankCounts).reduce((s, v) => s + v, 0);
    updatePlayer(playerIdx, { rankCounts: newRankCounts, handSize: newHandSize });
  };

  const totalDeckCards = players.reduce((s, p) => s + p.handSize, 0);
  const deckMismatch = totalDeckCards !== rules.deckSize;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Player Count */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Players</label>
        <div style={{ display: "flex", gap: 8 }}>
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => setPlayerCount(n)}
              aria-pressed={players.length === n}
              style={{
                background: players.length === n ? "#5B8DEF" : "#0B1020",
                color: "#F8FAFC",
                border: "1px solid #1E2D45",
                borderRadius: 4,
                padding: "4px 16px",
                cursor: "pointer",
                fontWeight: players.length === n ? 700 : 400,
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Per-Player Config */}
      {players.map((player, i) => (
        <div
          key={player.id}
          style={{
            ...sectionStyle,
            borderLeft: `3px solid ${PLAYER_COLORS[i % PLAYER_COLORS.length]}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span
              style={{
                color: PLAYER_COLORS[i % PLAYER_COLORS.length],
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {PLAYER_LABELS[i]}
            </span>
            <input
              style={{ ...inputStyle, width: 140 }}
              value={player.displayName}
              onChange={(e) => updatePlayer(i, { displayName: e.target.value })}
              aria-label={`Player ${PLAYER_LABELS[i]} name`}
            />
            <span style={{ color: "#AAB6C8", fontSize: 12, marginLeft: "auto" }}>
              {player.handSize} cards
            </span>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>Order Mode</label>
            <select
              style={selectStyle}
              value={player.orderMode}
              onChange={(e) =>
                updatePlayer(i, { orderMode: e.target.value as OrderMode })
              }
              aria-label={`Player ${PLAYER_LABELS[i]} order mode`}
            >
              <option value="randomized-fixed">Randomized (Unknown)</option>
              <option value="partial-prefix">Partial Prefix Known</option>
              <option value="ordered">Fully Ordered (Known)</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Card Counts by Rank</label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 4,
              }}
            >
              {DEFAULT_RANKS.map((rank) => (
                <div key={rank} style={{ textAlign: "center" }}>
                  <div style={{ color: "#AAB6C8", fontSize: 10 }}>{rank}</div>
                  <input
                    type="number"
                    min={0}
                    max={12}
                    value={player.rankCounts[rank] ?? 0}
                    onChange={(e) =>
                      updateRankCount(i, rank, parseInt(e.target.value) || 0)
                    }
                    aria-label={`Player ${PLAYER_LABELS[i]} ${rank} count`}
                    style={{
                      ...inputStyle,
                      width: "100%",
                      padding: "2px 4px",
                      textAlign: "center",
                      fontSize: 12,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {deckMismatch && (
        <div
          style={{
            background: "#2A1A1A",
            border: "1px solid #F87171",
            borderRadius: 6,
            padding: "8px 12px",
            color: "#F87171",
            fontSize: 12,
            marginBottom: 12,
          }}
          role="alert"
        >
          ⚠️ Cards in hands ({totalDeckCards}) ≠ deck size ({rules.deckSize})
        </div>
      )}

      {/* Rule Config */}
      <div style={sectionStyle}>
        <div style={{ color: "#F8FAFC", fontWeight: 600, marginBottom: 10, fontSize: 13 }}>
          Rules
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label style={labelStyle}>Deck Size</label>
            <input
              type="number"
              style={inputStyle}
              value={rules.deckSize}
              onChange={(e) =>
                onRulesChange({ ...rules, deckSize: parseInt(e.target.value) || 52 })
              }
              aria-label="Deck size"
            />
          </div>
          <div>
            <label style={labelStyle}>War Depth</label>
            <select
              style={selectStyle}
              value={rules.warDepthMode}
              onChange={(e) =>
                onRulesChange({ ...rules, warDepthMode: e.target.value as RuleConfig["warDepthMode"] })
              }
              aria-label="War depth mode"
            >
              <option value="single">Single</option>
              <option value="double">Double</option>
              <option value="triple">Triple</option>
              <option value="recursive">Recursive</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>War Participants</label>
            <select
              style={selectStyle}
              value={rules.warParticipantsPolicy}
              onChange={(e) =>
                onRulesChange({
                  ...rules,
                  warParticipantsPolicy: e.target.value as RuleConfig["warParticipantsPolicy"],
                })
              }
              aria-label="War participants policy"
            >
              <option value="tied_only">Tied Only</option>
              <option value="all_players">All Players</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Capture Order</label>
            <select
              style={selectStyle}
              value={rules.captureOrderPolicy}
              onChange={(e) =>
                onRulesChange({
                  ...rules,
                  captureOrderPolicy: e.target.value as RuleConfig["captureOrderPolicy"],
                })
              }
              aria-label="Capture order policy"
            >
              <option value="winner_first">Winner First</option>
              <option value="loser_first">Loser First</option>
              <option value="reveal_order">Reveal Order</option>
              <option value="play_order">Play Order</option>
              <option value="randomized">Randomized</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Insufficient Cards</label>
            <select
              style={selectStyle}
              value={rules.insufficientCardsPolicy}
              onChange={(e) =>
                onRulesChange({
                  ...rules,
                  insufficientCardsPolicy: e.target.value as RuleConfig["insufficientCardsPolicy"],
                })
              }
              aria-label="Insufficient cards policy"
            >
              <option value="immediate_loss">Immediate Loss</option>
              <option value="all_in">All In</option>
              <option value="reuse_last_faceup">Reuse Last Face-Up</option>
              <option value="equalize_to_shortest">Equalize to Shortest</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Face-Down (War)</label>
            <input
              type="number"
              style={inputStyle}
              value={rules.faceDownSchedulePerWarLevel[0] ?? 1}
              min={0}
              max={10}
              onChange={(e) =>
                onRulesChange({
                  ...rules,
                  faceDownSchedulePerWarLevel: [parseInt(e.target.value) || 1],
                })
              }
              aria-label="Face down cards per war level"
            />
          </div>
        </div>
      </div>

      {/* Solver Config */}
      <div style={sectionStyle}>
        <div style={{ color: "#F8FAFC", fontWeight: 600, marginBottom: 10, fontSize: 13 }}>
          Solver
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label style={labelStyle}>Mode</label>
            <select
              style={selectStyle}
              value={solverConfig.mode}
              onChange={(e) =>
                onSolverConfigChange({
                  ...solverConfig,
                  mode: e.target.value as SolverConfig["mode"],
                })
              }
              aria-label="Solver mode"
            >
              <option value="auto">Auto</option>
              <option value="exact">Exact</option>
              <option value="simulation">Monte Carlo</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>MC Runs</label>
            <input
              type="number"
              style={inputStyle}
              value={solverConfig.monteCarloRuns}
              min={100}
              max={50000}
              step={100}
              onChange={(e) =>
                onSolverConfigChange({
                  ...solverConfig,
                  monteCarloRuns: parseInt(e.target.value) || 1000,
                })
              }
              aria-label="Monte Carlo runs"
            />
          </div>
          <div>
            <label style={labelStyle}>Seed</label>
            <input
              type="number"
              style={inputStyle}
              value={solverConfig.monteCarloSeed}
              onChange={(e) =>
                onSolverConfigChange({
                  ...solverConfig,
                  monteCarloSeed: parseInt(e.target.value) || 42,
                })
              }
              aria-label="Monte Carlo seed"
            />
          </div>
          <div>
            <label style={labelStyle}>Round Cap</label>
            <input
              type="number"
              style={inputStyle}
              value={solverConfig.roundCap ?? 10000}
              min={100}
              max={100000}
              step={100}
              onChange={(e) =>
                onSolverConfigChange({
                  ...solverConfig,
                  roundCap: parseInt(e.target.value) || 10000,
                })
              }
              aria-label="Round cap"
            />
          </div>
        </div>
      </div>

      <button
        onClick={onRun}
        disabled={running || deckMismatch}
        aria-busy={running}
        style={{
          background: running || deckMismatch ? "#1E2D45" : "#5B8DEF",
          color: running || deckMismatch ? "#AAB6C8" : "#F8FAFC",
          border: "none",
          borderRadius: 6,
          padding: "12px 0",
          fontSize: 15,
          fontWeight: 700,
          cursor: running || deckMismatch ? "not-allowed" : "pointer",
          transition: "background 0.2s",
          letterSpacing: "0.03em",
        }}
      >
        {running ? "Running…" : "Run Analysis"}
      </button>
    </div>
  );
};
