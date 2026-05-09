import type { SimulationOutput } from "../engine/types";

export type DeltaResult = {
  playerId: string;
  before: number;
  after: number;
  delta: number;
};

/**
 * Compute win probability delta between two simulation outputs.
 * Returns per-player delta = P_i(win | after) - P_i(win | before).
 */
export function computeDeltas(
  before: SimulationOutput,
  after: SimulationOutput
): DeltaResult[] {
  return after.perPlayer.map((pp) => {
    const beforePlayer = before.perPlayer.find((p) => p.id === pp.id);
    const beforeProb = beforePlayer?.winProbability ?? 0;
    return {
      playerId: pp.id,
      before: beforeProb,
      after: pp.winProbability,
      delta: pp.winProbability - beforeProb,
    };
  });
}

/**
 * Apply deltas from comparison to simulation output (mutates copy).
 */
export function applyDeltas(
  current: SimulationOutput,
  previous: SimulationOutput | null
): SimulationOutput {
  if (!previous) return current;

  const deltas = computeDeltas(previous, current);
  return {
    ...current,
    perPlayer: current.perPlayer.map((pp) => {
      const delta = deltas.find((d) => d.playerId === pp.id);
      return {
        ...pp,
        deltaFromLastEvent: delta?.delta ?? 0,
      };
    }),
  };
}
