import type { PlayerStateInput, RuleConfig, SimulationOutput } from "../engine/types";
import { simulateGame, makeLCG } from "../engine/gameEngine";
import type { PlayerHand } from "../engine/gameEngine";

/**
 * Exact ordered-state solver.
 * Only valid when all players have orderMode="ordered" (fully known hand order).
 * Plays the game forward deterministically.
 */
export function exactSolve(
  players: PlayerStateInput[],
  rules: RuleConfig,
  roundCap: number
): SimulationOutput {
  // Build hands from orderedCards
  const hands: PlayerHand[] = players.map((p) => ({
    id: p.id,
    cards: (p.orderedCards ?? []).map((c) => ({
      rank: c.rank,
      suit: c.suit,
      id: c.id,
    })),
  }));

  const rng = makeLCG(42); // deterministic, won't be used for order
  const result = simulateGame(hands, rules, rng, roundCap);

  // Build place marginals: each player gets place 1 = winner, 2 = 2nd out, etc.
  const n = players.length;
  const placeMarginals: Record<string, Record<number, number>> = {};
  for (const p of players) {
    placeMarginals[p.id] = {};
    for (let place = 1; place <= n; place++) placeMarginals[p.id][place] = 0;
  }

  // Determine places from elimination order
  const eliminationOrder = result.eliminationOrder;
  // Players eliminated first get higher place numbers
  // Winner = place 1, first eliminated = place n, etc.
  const survivors = players
    .filter((p) => !eliminationOrder.includes(p.id))
    .map((p) => p.id);
  const orderedByPlace: string[] = [
    ...survivors,
    ...[...eliminationOrder].reverse(),
  ];
  for (let i = 0; i < orderedByPlace.length; i++) {
    const id = orderedByPlace[i];
    placeMarginals[id][i + 1] = 1;
  }

  const winnerId = result.winnerId;

  // Build histogram for rounds
  const totalRounds = result.totalRounds;
  const histogram = [
    {
      bucketStart: 0,
      bucketEnd: totalRounds,
      probability: 1,
    },
  ];

  return {
    solverModeUsed: "exact",
    loopDetected: result.loopDetected,
    terminationProbability: result.loopDetected ? 0 : 1,
    perPlayer: players.map((p) => ({
      id: p.id,
      winProbability: p.id === winnerId ? 1 : 0,
      expectedRemainingRounds: totalRounds,
      placeMarginals: placeMarginals[p.id],
    })),
    finishOrderProbabilities: [
      {
        finishOrder: orderedByPlace,
        probability: 1,
      },
    ],
    remainingRoundsDistribution: {
      mean: totalRounds,
      median: totalRounds,
      p10: totalRounds,
      p90: totalRounds,
      histogram,
    },
    diagnostics: {
      sampledStates: 1,
      latentOrderCountEstimate: 1,
      monteCarloRunsUsed: 0,
      maxWarDepthObserved: result.maxWarDepthObserved,
    },
  };
}
