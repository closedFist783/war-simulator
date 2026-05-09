import type {
  PlayerStateInput,
  RuleConfig,
  SolverConfig,
  SimulationOutput,
} from "../engine/types";
import { estimateLatentCount } from "./enumSolver";
import { exactSolve } from "./exactSolver";
import { enumSolve } from "./enumSolver";
import { mcSolve } from "./mcSolver";

/**
 * Main solver entry point. Auto-selects strategy based on config.
 */
export async function runSolver(
  players: PlayerStateInput[],
  rules: RuleConfig,
  solverConfig: SolverConfig
): Promise<SimulationOutput> {
  const roundCap = solverConfig.roundCap ?? 10000;
  const seed = solverConfig.monteCarloSeed;

  // Determine mode
  let effectiveMode = solverConfig.mode;

  if (effectiveMode === "auto" || effectiveMode === "hybrid") {
    const allOrdered = players.every(
      (p) => p.orderMode === "ordered" && p.orderedCards && p.orderedCards.length === p.handSize
    );

    if (allOrdered) {
      effectiveMode = "exact";
    } else {
      const latentCount = estimateLatentCount(players);
      if (latentCount <= solverConfig.exactLatentThreshold) {
        effectiveMode = "exact"; // Use enum solver (exhaustive)
      } else {
        effectiveMode = "simulation";
      }
    }
  }

  switch (effectiveMode) {
    case "exact": {
      const allOrdered = players.every(
        (p) =>
          p.orderMode === "ordered" &&
          p.orderedCards &&
          p.orderedCards.length === p.handSize
      );

      if (allOrdered) {
        return exactSolve(players, rules, roundCap);
      } else {
        // Enumerate all consistent orderings (may be slow for large latent spaces)
        const latentCount = Math.min(
          estimateLatentCount(players),
          solverConfig.exactLatentThreshold
        );
        const runs = Math.min(Math.max(Math.round(latentCount), 100), 5000);
        return enumSolve(players, rules, runs, seed, roundCap);
      }
    }

    case "simulation": {
      return mcSolve(
        players,
        rules,
        solverConfig.monteCarloRuns,
        seed,
        roundCap,
        solverConfig.targetHalfWidth95,
        solverConfig.maxMonteCarloRuns
      );
    }

    default:
      return mcSolve(
        players,
        rules,
        solverConfig.monteCarloRuns,
        seed,
        roundCap,
        solverConfig.targetHalfWidth95,
        solverConfig.maxMonteCarloRuns
      );
  }
}

export { computeDeltas, applyDeltas } from "./deltaSolver";
export { estimateLatentCount } from "./enumSolver";
