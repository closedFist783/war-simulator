export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A" | string;

export type Card = {
  rank: Rank;
  suit?: string;
  id?: string;
};

export type OrderMode = "ordered" | "randomized-fixed" | "partial-prefix";

export type RankCounts = Record<Rank, number>;

export type PlayerStateInput = {
  id: string;
  displayName: string;
  handSize: number;
  orderMode: OrderMode;
  orderedCards?: Card[];
  knownTopPrefix?: Card[];
  rankCounts: RankCounts;
  visibleCards?: Card[];
};

export type VisibleState = {
  potCards: Card[];
  currentBattleCards: Record<string, Card | null>;
  revealedHistory: Array<{
    roundIndex: number;
    cards: Record<string, Card[]>;
    winnerId?: string;
    isWar: boolean;
  }>;
  removedCards?: Card[];
};

export type WarDepthMode = "single" | "double" | "triple" | "recursive";

export type WarParticipantsPolicy = "all_players" | "tied_only";

export type CaptureOrderPolicy =
  | "winner_first"
  | "loser_first"
  | "reveal_order"
  | "play_order"
  | "randomized";

export type InsufficientCardsPolicy =
  | "immediate_loss"
  | "reuse_last_faceup"
  | "all_in"
  | "equalize_to_shortest";

export type RuleConfig = {
  playerCount: number;
  deckSize: number;
  rankOrderHighToLow: Rank[];
  warParticipantsPolicy: WarParticipantsPolicy;
  warDepthMode: WarDepthMode;
  maxWarLevels?: number;
  faceDownSchedulePerWarLevel: number[];
  captureOrderPolicy: CaptureOrderPolicy;
  insufficientCardsPolicy: InsufficientCardsPolicy;
  orderedOrRandomizedDefault: "ordered" | "randomized-fixed";
};

export type SolverConfig = {
  mode: "auto" | "exact" | "simulation" | "hybrid";
  exactLatentThreshold: number;
  maxReachableStateThreshold: number;
  monteCarloRuns: number;
  monteCarloSeed: number;
  targetHalfWidth95?: number;
  maxMonteCarloRuns?: number;
  roundCap?: number;
};

export type SimulationOutput = {
  solverModeUsed: "exact" | "simulation" | "hybrid";
  loopDetected: boolean;
  terminationProbability?: number;
  perPlayer: Array<{
    id: string;
    winProbability: number;
    confidenceInterval95?: [number, number];
    expectedRemainingRounds: number;
    expectedRemainingRoundsCI95?: [number, number];
    placeMarginals: Record<number, number>;
    deltaFromLastEvent?: number;
  }>;
  finishOrderProbabilities?: Array<{
    finishOrder: string[];
    probability: number;
  }>;
  remainingRoundsDistribution: {
    mean: number;
    median?: number;
    p10?: number;
    p90?: number;
    histogram?: Array<{
      bucketStart: number;
      bucketEnd: number;
      probability: number;
    }>;
  };
  diagnostics: {
    sampledStates?: number;
    latentOrderCountEstimate?: number;
    monteCarloRunsUsed?: number;
    seed?: number;
    maxWarDepthObserved?: number;
  };
};
