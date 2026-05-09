import type { PlayerStateInput, RankCounts, VisibleState, RuleConfig } from "./types";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

function countCards(rc: RankCounts): number {
  return Object.values(rc).reduce((sum, v) => sum + v, 0);
}

export function validateGameState(
  players: PlayerStateInput[],
  visible: VisibleState,
  rules: RuleConfig
): ValidationResult {
  const errors: string[] = [];

  // Check player count
  if (players.length < 2 || players.length > 4) {
    errors.push(`Player count must be 2-4, got ${players.length}`);
  }

  let totalCards = 0;

  for (const p of players) {
    // Check all rankCounts are non-negative integers
    for (const [rank, count] of Object.entries(p.rankCounts)) {
      if (!Number.isInteger(count) || count < 0) {
        errors.push(`Player ${p.id}: rank ${rank} count must be a non-negative integer`);
      }
    }

    // Check sum of rankCounts == handSize
    const rcSum = countCards(p.rankCounts);
    if (rcSum !== p.handSize) {
      errors.push(
        `Player ${p.id}: sum of rankCounts (${rcSum}) != handSize (${p.handSize})`
      );
    }
    totalCards += p.handSize;

    // Validate ordered prefix vs rankCounts
    if (p.orderMode === "ordered" && p.orderedCards) {
      if (p.orderedCards.length !== p.handSize) {
        errors.push(
          `Player ${p.id}: orderedCards length (${p.orderedCards.length}) != handSize (${p.handSize})`
        );
      }
      // Check prefix consistency
      const rankCountsCheck: RankCounts = { ...p.rankCounts };
      for (const card of p.orderedCards) {
        if (!rankCountsCheck[card.rank] || rankCountsCheck[card.rank] <= 0) {
          errors.push(
            `Player ${p.id}: orderedCards contains rank ${card.rank} not present in rankCounts`
          );
          break;
        }
        rankCountsCheck[card.rank]--;
      }
    }

    if (p.orderMode === "partial-prefix" && p.knownTopPrefix) {
      const prefixRankCounts: RankCounts = {};
      for (const card of p.knownTopPrefix) {
        prefixRankCounts[card.rank] = (prefixRankCounts[card.rank] || 0) + 1;
      }
      for (const [rank, count] of Object.entries(prefixRankCounts)) {
        if ((p.rankCounts[rank] || 0) < count) {
          errors.push(
            `Player ${p.id}: knownTopPrefix contains more ${rank} than rankCounts allows`
          );
        }
      }
    }
  }

  // Count pot cards
  totalCards += visible.potCards.length;

  // Count removed cards
  if (visible.removedCards) {
    totalCards += visible.removedCards.length;
  }

  // Validate total card count
  if (totalCards !== rules.deckSize) {
    errors.push(
      `Total cards (${totalCards}) does not equal deckSize (${rules.deckSize}). ` +
        `Check hand sizes (${players.map((p) => p.handSize).join(", ")}), ` +
        `pot (${visible.potCards.length}), removed (${visible.removedCards?.length ?? 0}).`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
