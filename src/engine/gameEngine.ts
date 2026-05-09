import type { Card, RuleConfig, Rank } from "./types";
import { LoopDetector } from "./loopDetector";

export type PlayerHand = {
  id: string;
  cards: Card[];
};

export type RoundResult = {
  roundIndex: number;
  winnerId: string | null; // null = elimination with no winner (all out)
  isWar: boolean;
  warDepth: number;
  loopDetected: boolean;
  eliminated: string[]; // players eliminated this round
  finalHands: Record<string, number>; // card counts after round
};

export type GameResult = {
  rounds: RoundResult[];
  winnerId: string | null;
  loopDetected: boolean;
  eliminationOrder: string[]; // order of elimination (first = out first)
  totalRounds: number;
  maxWarDepthObserved: number;
};

function rankIndex(rank: Rank, rankOrderHighToLow: Rank[]): number {
  const idx = rankOrderHighToLow.indexOf(rank);
  return idx === -1 ? rankOrderHighToLow.length : idx; // lower index = stronger
}

function shuffle(arr: Card[], rng: () => number): Card[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function captureCards(
  won: Card[],
  policy: RuleConfig["captureOrderPolicy"],
  rng: () => number
): Card[] {
  switch (policy) {
    case "winner_first":
      return won;
    case "loser_first":
      return [...won].reverse();
    case "reveal_order":
    case "play_order":
      return won;
    case "randomized":
      return shuffle(won, rng);
    default:
      return won;
  }
}

// Simple seeded LCG RNG
export function makeLCG(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export function simulateGame(
  initialHands: PlayerHand[],
  rules: RuleConfig,
  rng: () => number,
  roundCap = 10000
): GameResult {
  const loopDetector = new LoopDetector();
  const rounds: RoundResult[] = [];
  const eliminationOrder: string[] = [];
  let maxWarDepthObserved = 0;
  let loopDetected = false;

  // Deep copy hands
  let hands: PlayerHand[] = initialHands.map((p) => ({
    id: p.id,
    cards: [...p.cards],
  }));

  let roundIndex = 0;

  while (hands.filter((h) => h.cards.length > 0).length > 1) {
    if (roundIndex >= roundCap) {
      loopDetected = true;
      break;
    }

    // Check for loops (only when all hands are deterministic)
    const snapshot = hands.map((h) => h.cards.map((c) => c.rank));
    if (loopDetector.checkAndRecord(snapshot)) {
      loopDetected = true;
      break;
    }

    const activePlayers = hands.filter((h) => h.cards.length > 0);
    const result = playBattleRound(
      activePlayers,
      hands,
      rules,
      rng,
      roundIndex,
      0
    );

    if (result.maxWarDepth > maxWarDepthObserved) {
      maxWarDepthObserved = result.maxWarDepth;
    }

    // Handle eliminations
    const eliminated: string[] = [];
    for (const h of hands) {
      if (h.cards.length === 0 && !eliminationOrder.includes(h.id)) {
        eliminated.push(h.id);
        eliminationOrder.push(h.id);
      }
    }

    rounds.push({
      roundIndex,
      winnerId: result.winnerId,
      isWar: result.isWar,
      warDepth: result.maxWarDepth,
      loopDetected: false,
      eliminated,
      finalHands: Object.fromEntries(hands.map((h) => [h.id, h.cards.length])),
    });

    roundIndex++;
  }

  const remaining = hands.filter((h) => h.cards.length > 0);
  let winnerId: string | null = null;
  if (remaining.length === 1) {
    winnerId = remaining[0].id;
  }

  return {
    rounds,
    winnerId,
    loopDetected,
    eliminationOrder,
    totalRounds: roundIndex,
    maxWarDepthObserved,
  };
}

type BattleResult = {
  winnerId: string | null;
  isWar: boolean;
  maxWarDepth: number;
};

function playBattleRound(
  activePlayers: PlayerHand[],
  allHands: PlayerHand[],
  rules: RuleConfig,
  rng: () => number,
  roundIndex: number,
  warDepth: number
): BattleResult {
  const pot: Card[] = [];
  const battleCards: { playerId: string; card: Card }[] = [];

  // Each active player plays one card
  for (const player of activePlayers) {
    if (player.cards.length === 0) {
      // Handle insufficient cards
      if (rules.insufficientCardsPolicy === "immediate_loss") {
        continue; // player can't play, excluded
      }
    }
    if (player.cards.length > 0) {
      const card = player.cards.shift()!;
      battleCards.push({ playerId: player.id, card });
      pot.push(card);
    }
  }

  if (battleCards.length === 0) {
    return { winnerId: null, isWar: false, maxWarDepth: warDepth };
  }

  if (battleCards.length === 1) {
    // Only one player could play — they win the pot
    const winner = allHands.find((h) => h.id === battleCards[0].playerId)!;
    const ordered = captureCards(pot, rules.captureOrderPolicy, rng);
    winner.cards.push(...ordered);
    return { winnerId: winner.id, isWar: false, maxWarDepth: warDepth };
  }

  // Find best rank
  const bestIdx = battleCards.reduce((bestI, bc, i) => {
    const bestRankIdx = rankIndex(battleCards[bestI].card.rank, rules.rankOrderHighToLow);
    const thisRankIdx = rankIndex(bc.card.rank, rules.rankOrderHighToLow);
    return thisRankIdx < bestRankIdx ? i : bestI;
  }, 0);
  const bestRank = battleCards[bestIdx].card.rank;

  // Find tied players
  const tiedPlayers = battleCards.filter(
    (bc) => bc.card.rank === bestRank
  );

  if (tiedPlayers.length === 1) {
    // Clear winner
    const winner = allHands.find((h) => h.id === tiedPlayers[0].playerId)!;
    const ordered = captureCards(pot, rules.captureOrderPolicy, rng);
    winner.cards.push(...ordered);
    return { winnerId: winner.id, isWar: false, maxWarDepth: warDepth };
  }

  // WAR!
  const isWar = true;
  const newWarDepth = warDepth + 1;

  // Determine max war levels
  let maxWarLevels = rules.maxWarLevels ?? Infinity;
  if (rules.warDepthMode === "single") maxWarLevels = 1;
  else if (rules.warDepthMode === "double") maxWarLevels = 2;
  else if (rules.warDepthMode === "triple") maxWarLevels = 3;
  else if (rules.warDepthMode === "recursive") maxWarLevels = Infinity;

  if (newWarDepth > maxWarLevels) {
    // Can't go deeper — tied players split or winner is random
    const winnerIdx = Math.floor(rng() * tiedPlayers.length);
    const winner = allHands.find((h) => h.id === tiedPlayers[winnerIdx].playerId)!;
    const ordered = captureCards(pot, rules.captureOrderPolicy, rng);
    winner.cards.push(...ordered);
    return { winnerId: winner.id, isWar, maxWarDepth: newWarDepth };
  }

  // Determine war participants
  let warParticipants: PlayerHand[];
  if (rules.warParticipantsPolicy === "tied_only") {
    warParticipants = tiedPlayers
      .map((bc) => allHands.find((h) => h.id === bc.playerId)!)
      .filter(Boolean);
  } else {
    // all_players: all active players participate in war
    warParticipants = activePlayers;
  }

  // Face-down cards for this war level
  const faceDownCount =
    rules.faceDownSchedulePerWarLevel[Math.min(warDepth, rules.faceDownSchedulePerWarLevel.length - 1)] ?? 1;

  for (const player of warParticipants) {
    if (player.cards.length === 0) {
      if (rules.insufficientCardsPolicy === "immediate_loss") {
        // Player is eliminated — empty hand triggers removal
        continue;
      } else if (rules.insufficientCardsPolicy === "all_in") {
        // Player goes all in — plays remaining cards (already 0)
        continue;
      }
    }

    // Play face-down cards
    const available = Math.min(faceDownCount, player.cards.length);
    for (let i = 0; i < available; i++) {
      if (player.cards.length > 0) {
        pot.push(player.cards.shift()!);
      }
    }
  }

  // Active war participants still have cards
  const warActive = warParticipants.filter((p) => p.cards.length > 0);

  if (warActive.length <= 1) {
    if (warActive.length === 1) {
      const winner = warActive[0];
      const ordered = captureCards(pot, rules.captureOrderPolicy, rng);
      winner.cards.push(...ordered);
      return { winnerId: winner.id, isWar, maxWarDepth: newWarDepth };
    }
    return { winnerId: null, isWar, maxWarDepth: newWarDepth };
  }

  // Recurse into next war battle
  const subResult = playBattleRound(
    warActive,
    allHands,
    rules,
    rng,
    roundIndex,
    newWarDepth
  );

  return {
    ...subResult,
    isWar,
    maxWarDepth: Math.max(subResult.maxWarDepth, newWarDepth),
  };
}

/**
 * Build a standard deck based on rules.deckSize and rank order.
 */
export function buildDeck(rules: RuleConfig): Card[] {
  const suits = ["♠", "♥", "♦", "♣"];
  const cards: Card[] = [];
  const ranksInDeck = rules.rankOrderHighToLow;
  const cardsPerRank = Math.floor(rules.deckSize / ranksInDeck.length);

  for (const rank of ranksInDeck) {
    for (let i = 0; i < cardsPerRank; i++) {
      cards.push({
        rank,
        suit: suits[i % suits.length],
        id: `${rank}${suits[i % suits.length]}`,
      });
    }
  }

  // Fill remainder
  let i = 0;
  while (cards.length < rules.deckSize) {
    cards.push({
      rank: ranksInDeck[i % ranksInDeck.length],
      suit: suits[i % suits.length],
      id: `extra-${i}`,
    });
    i++;
  }

  return cards;
}

/**
 * Deal a shuffled deck to N players.
 */
export function dealCards(
  deck: Card[],
  playerIds: string[],
  rng: () => number
): PlayerHand[] {
  const shuffled = shuffle(deck, rng);
  const hands: PlayerHand[] = playerIds.map((id) => ({ id, cards: [] }));
  for (let i = 0; i < shuffled.length; i++) {
    hands[i % hands.length].cards.push(shuffled[i]);
  }
  return hands;
}
