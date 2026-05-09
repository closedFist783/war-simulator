import type { PlayerStateInput, RuleConfig, SimulationOutput } from "../engine/types";
import { enumSolve } from "./enumSolver";

/**
 * Wilson score 95% confidence interval for a proportion.
 */
export function wilsonCI(successes: number, n: number): [number, number] {
  if (n === 0) return [0, 1];
  const z = 1.96; // 95% CI
  const phat = successes / n;
  const center = (phat + (z * z) / (2 * n)) / (1 + (z * z) / n);
  const margin =
    (z * Math.sqrt((phat * (1 - phat)) / n + (z * z) / (4 * n * n))) /
    (1 + (z * z) / n);
  return [Math.max(0, center - margin), Math.min(1, center + margin)];
}

function halfWidth(ci: [number, number]): number {
  return (ci[1] - ci[0]) / 2;
}

/**
 * Adaptive Monte Carlo solver.
 * Runs batches of simulations, checking convergence after each batch.
 */
export function mcSolve(
  players: PlayerStateInput[],
  rules: RuleConfig,
  initialRuns: number,
  seed: number,
  roundCap: number,
  targetHalfWidth95?: number,
  maxMonteCarloRuns?: number
): SimulationOutput {
  const batchSize = Math.min(initialRuns, 500);
  const maxRuns = maxMonteCarloRuns ?? Math.max(initialRuns, 10000);
  const target = targetHalfWidth95 ?? 0.02;

  let totalRuns = 0;
  let bestResult: SimulationOutput | null = null;

  while (totalRuns < maxRuns) {
    const runsThisBatch = Math.min(batchSize, maxRuns - totalRuns);
    const result = enumSolve(
      players,
      rules,
      totalRuns + runsThisBatch,
      seed,
      roundCap
    );
    totalRuns += runsThisBatch;
    bestResult = result;

    // Check convergence: all players' win probability CIs are tight enough
    let converged = true;
    for (const pp of result.perPlayer) {
      const successes = pp.winProbability * totalRuns;
      const ci = wilsonCI(successes, totalRuns);
      if (halfWidth(ci) > target) {
        converged = false;
        break;
      }
    }
    if (converged) break;
  }

  // Add Wilson CIs to final result
  if (bestResult) {
    const finalResult: SimulationOutput = {
      ...bestResult,
      solverModeUsed: "simulation",
      perPlayer: bestResult.perPlayer.map((pp) => {
        const successes = pp.winProbability * totalRuns;
        const ci = wilsonCI(successes, totalRuns);
        const roundCI: [number, number] = [
          bestResult!.remainingRoundsDistribution.p10 ?? bestResult!.remainingRoundsDistribution.mean * 0.8,
          bestResult!.remainingRoundsDistribution.p90 ?? bestResult!.remainingRoundsDistribution.mean * 1.2,
        ];
        return {
          ...pp,
          confidenceInterval95: ci,
          expectedRemainingRoundsCI95: roundCI,
        };
      }),
      diagnostics: {
        ...bestResult.diagnostics,
        monteCarloRunsUsed: totalRuns,
        seed,
      },
    };
    return finalResult;
  }

  // Fallback (shouldn't happen)
  return enumSolve(players, rules, initialRuns, seed, roundCap);
}
