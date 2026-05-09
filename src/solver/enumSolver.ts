import type { PlayerStateInput, RuleConfig, SimulationOutput, RankCounts, Card } from "../engine/types";
import { simulateGame, makeLCG } from "../engine/gameEngine";
import type { PlayerHand } from "../engine/gameEngine";

/**
 * Estimate the number of latent orderings consistent with rankCounts + prefix.
 * For a player with known prefix P and remaining R cards with counts,
 * latent count = multinomial(R; c1, c2, ...) = R! / (c1! * c2! * ...)
 */
function logFactorial(n: number): number {
  if (n <= 1) return 0;
  let result = 0;
  for (let i = 2; i <= n; i++) result += Math.log(i);
  return result;
}

export function estimateLatentCount(players: PlayerStateInput[]): number {
  let logTotal = 0;
  for (const p of players) {
    const prefix = p.knownTopPrefix ?? [];
    const prefixRankUsed: RankCounts = {};
    for (const c of prefix) {
      prefixRankUsed[c.rank] = (prefixRankUsed[c.rank] || 0) + 1;
    }

    const remainingCounts: RankCounts = {};
    for (const [rank, count] of Object.entries(p.rankCounts)) {
      const used = prefixRankUsed[rank] ?? 0;
      const remaining = count - used;
      if (remaining > 0) remainingCounts[rank] = remaining;
    }

    const R = Object.values(remainingCounts).reduce((s, v) => s + v, 0);
    logTotal += logFactorial(R);
    for (const count of Object.values(remainingCounts)) {
      logTotal -= logFactorial(count);
    }
  }
  return Math.exp(logTotal);
}

/**
 * Generate one random ordering consistent with rankCounts and known prefix.
 */
function sampleOrdering(
  p: PlayerStateInput,
  rng: () => number
): Card[] {
  const prefix = p.knownTopPrefix ?? [];

  // Build remaining pool
  const prefixRankUsed: RankCounts = {};
  for (const c of prefix) {
    prefixRankUsed[c.rank] = (prefixRankUsed[c.rank] || 0) + 1;
  }

  const pool: Card[] = [];
  for (const [rank, count] of Object.entries(p.rankCounts)) {
    const used = prefixRankUsed[rank] ?? 0;
    const remaining = count - used;
    for (let i = 0; i < remaining; i++) {
      pool.push({ rank, id: `${p.id}-${rank}-${i}` });
    }
  }

  // Fisher-Yates shuffle pool
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return [
    ...prefix.map((c) => ({ rank: c.rank, suit: c.suit, id: c.id })),
    ...pool,
  ];
}

/**
 * Enumerate (sample) latent orderings and run each to completion.
 * For small latent spaces, this can be exhaustive; for large, it samples.
 */
export function enumSolve(
  players: PlayerStateInput[],
  rules: RuleConfig,
  runs: number,
  seed: number,
  roundCap: number
): SimulationOutput {
  const rng = makeLCG(seed);
  const n = players.length;

  const winCounts: Record<string, number> = {};
  const placeCounts: Record<string, Record<number, number>> = {};
  const roundCounts: number[] = [];
  let loopCount = 0;
  let maxWarDepth = 0;
  const finishOrderCounts: Record<string, number> = {};

  for (const p of players) {
    winCounts[p.id] = 0;
    placeCounts[p.id] = {};
    for (let pl = 1; pl <= n; pl++) placeCounts[p.id][pl] = 0;
  }

  for (let run = 0; run < runs; run++) {
    const hands: PlayerHand[] = players.map((p) => ({
      id: p.id,
      cards: p.orderMode === "ordered" && p.orderedCards
        ? p.orderedCards.map((c) => ({ rank: c.rank, suit: c.suit, id: c.id }))
        : sampleOrdering(p, rng),
    }));

    const result = simulateGame(hands, rules, rng, roundCap);

    if (result.loopDetected) loopCount++;
    if (result.maxWarDepthObserved > maxWarDepth) maxWarDepth = result.maxWarDepthObserved;

    roundCounts.push(result.totalRounds);

    if (result.winnerId) winCounts[result.winnerId]++;

    // Place marginals
    const survivors = players
      .filter((p) => !result.eliminationOrder.includes(p.id))
      .map((p) => p.id);
    const orderedByPlace = [...survivors, ...[...result.eliminationOrder].reverse()];
    for (let i = 0; i < orderedByPlace.length; i++) {
      const id = orderedByPlace[i];
      if (placeCounts[id]) placeCounts[id][i + 1]++;
    }

    const orderKey = orderedByPlace.join(">");
    finishOrderCounts[orderKey] = (finishOrderCounts[orderKey] || 0) + 1;
  }

  // Compute statistics
  const mean = roundCounts.reduce((s, v) => s + v, 0) / runs;
  const sorted = [...roundCounts].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const p10 = sorted[Math.floor(sorted.length * 0.1)];
  const p90 = sorted[Math.floor(sorted.length * 0.9)];

  // Build histogram (20 buckets)
  const minR = sorted[0];
  const maxR = sorted[sorted.length - 1];
  const buckets = 20;
  const bucketSize = Math.max(1, Math.ceil((maxR - minR + 1) / buckets));
  const histMap: Record<number, number> = {};
  for (const r of roundCounts) {
    const b = Math.floor((r - minR) / bucketSize);
    histMap[b] = (histMap[b] || 0) + 1;
  }
  const histogram = Object.entries(histMap).map(([b, count]) => ({
    bucketStart: minR + Number(b) * bucketSize,
    bucketEnd: minR + (Number(b) + 1) * bucketSize,
    probability: count / runs,
  }));

  // Finish order probabilities (top entries)
  const finishOrderProbs = Object.entries(finishOrderCounts)
    .map(([key, count]) => ({
      finishOrder: key.split(">"),
      probability: count / runs,
    }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 20);

  const latentCount = estimateLatentCount(players);

  return {
    solverModeUsed: "simulation",
    loopDetected: loopCount > 0,
    terminationProbability: 1 - loopCount / runs,
    perPlayer: players.map((p) => ({
      id: p.id,
      winProbability: winCounts[p.id] / runs,
      expectedRemainingRounds: mean,
      placeMarginals: Object.fromEntries(
        Object.entries(placeCounts[p.id]).map(([k, v]) => [Number(k), v / runs])
      ),
    })),
    finishOrderProbabilities: finishOrderProbs,
    remainingRoundsDistribution: {
      mean,
      median,
      p10,
      p90,
      histogram,
    },
    diagnostics: {
      sampledStates: runs,
      latentOrderCountEstimate: latentCount,
      monteCarloRunsUsed: runs,
      seed,
      maxWarDepthObserved: maxWarDepth,
    },
  };
}
