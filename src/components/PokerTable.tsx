import { useState, useCallback, useRef, useEffect } from 'react';
import { PlayerArea } from './PlayerArea';
import type { PlayerHandState } from './PlayerArea';
import { DeckViewer } from './DeckViewer';
import { CenterTable } from './CenterTable';
import type { GamePhase } from './CenterTable';
import { FlyingCard } from './FlyingCard';
import { CardPicker } from './CardPicker';
import { WarBanner } from './WarBanner';
import { WinnerBanner } from './WinnerBanner';
import type { GameCard, Rank, Suit } from './CardComponent';
import { runSolver } from '../solver';
import type { PlayerStateInput, RuleConfig, SolverConfig, RankCounts } from '../engine/types';

const ALL_RANKS: Rank[] = ['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
const SUITS: Suit[] = ['♠','♣','♥','♦'];
const RANK_VALUES: Record<Rank, number> = {
  'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10,
  '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2,
};

const DEFAULT_RULES: RuleConfig = {
  playerCount: 2,
  deckSize: 52,
  rankOrderHighToLow: ALL_RANKS as string[],
  warParticipantsPolicy: 'tied_only',
  warDepthMode: 'recursive',
  faceDownSchedulePerWarLevel: [3],
  captureOrderPolicy: 'randomized',
  insufficientCardsPolicy: 'immediate_loss',
  orderedOrRandomizedDefault: 'randomized-fixed',
};

const DEFAULT_SOLVER_CONFIG: SolverConfig = {
  mode: 'auto',
  exactLatentThreshold: 50000,
  maxReachableStateThreshold: 100000,
  monteCarloRuns: 1000,
  monteCarloSeed: 42,
  roundCap: 500,
};

function randomSuit(): Suit {
  return SUITS[Math.floor(Math.random() * SUITS.length)];
}

function randomRank(counts: Record<Rank, number | null>, unknownCount: number): Rank {
  // Build weighted list from known + unknown
  const entries: Rank[] = [];
  for (const r of ALL_RANKS) {
    const c = counts[r];
    if (c === null) {
      // unknown: skip (handled by unknownCount)
    } else if (c > 0) {
      for (let i = 0; i < c; i++) entries.push(r);
    }
  }
  // Add unknown cards as uniform across all ranks
  if (unknownCount > 0) {
    const perRank = Math.ceil(unknownCount / ALL_RANKS.length);
    for (const r of ALL_RANKS) {
      for (let i = 0; i < perRank; i++) entries.push(r);
    }
  }
  if (entries.length === 0) return ALL_RANKS[0];
  return entries[Math.floor(Math.random() * entries.length)];
}


function dealDeck(): [GameCard[], GameCard[]] {
  const deck: GameCard[] = [];
  for (const rank of ALL_RANKS) {
    for (const suit of SUITS) {
      deck.push({ rank, suit, faceUp: false });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return [deck.slice(0, 26), deck.slice(26)];
}

function makeHandFromCards(cards: GameCard[], id: string, name: string): PlayerHandState {
  const rankCounts: Record<Rank, number | null> = {} as Record<Rank, number | null>;
  for (const r of ALL_RANKS) rankCounts[r] = 0;
  for (const c of cards) rankCounts[c.rank] = (rankCounts[c.rank] as number) + 1;
  return { id, name, cards: [...cards], rankCounts, unknownCount: 0, totalCards: cards.length, winProb: 0.5, prevWinProb: 0.5, delta: 0, expectedRounds: 100 };
}

function makeRankCountsForSolver(hand: PlayerHandState): RankCounts {
  const rc: RankCounts = {};
  let unknownLeft = hand.unknownCount;
  for (const r of ALL_RANKS) {
    const c = hand.rankCounts[r];
    if (c === null) {
      // distribute unknown evenly per rank
      rc[r] = Math.round(unknownLeft / (ALL_RANKS.length));
    } else {
      rc[r] = c;
    }
  }
  return rc;
}

interface FlyingCardEntry {
  id: string;
  card: GameCard;
  fromRect: DOMRect;
  toRect: DOMRect;
  delay: number;
}

interface CardPickerState {
  visible: boolean;
  playerId: 'p1' | 'p2';
  context: 'main' | 'war_decider';
}

export function PokerTable() {
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [roundNumber, setRoundNumber] = useState(0);
  // Deal one shared deck, split between players (lazy init so it only runs once)
  const [_initDeal] = useState<[PlayerHandState, PlayerHandState]>(() => {
    const [c1, c2] = dealDeck();
    return [makeHandFromCards(c1, 'player1', 'Player 1'), makeHandFromCards(c2, 'player2', 'Player 2')];
  });
  const [p1, setP1] = useState<PlayerHandState>(_initDeal[0]);
  const [p2, setP2] = useState<PlayerHandState>(_initDeal[1]);
  const [showDeckViewer, setShowDeckViewer] = useState<'p1' | 'p2' | null>(null);

  // Cards in play
  const [p1Card, setP1Card] = useState<GameCard | null>(null);
  const [p2Card, setP2Card] = useState<GameCard | null>(null);
  const [p1WarFaceDown, setP1WarFaceDown] = useState<GameCard[]>([]);
  const [p2WarFaceDown, setP2WarFaceDown] = useState<GameCard[]>([]);
  const [p1WarDecider, setP1WarDecider] = useState<GameCard | null>(null);
  const [p2WarDecider, setP2WarDecider] = useState<GameCard | null>(null);
  const [potCards, setPotCards] = useState<GameCard[]>([]);
  const [potSize, setPotSize] = useState(0);
  const [_winnerId, setWinnerId] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState('');
  const [isWar, setIsWar] = useState(false);

  // Choice tracking
  const [p1Chosen, setP1Chosen] = useState(false);
  const [p2Chosen, setP2Chosen] = useState(false);
  const [p1PendingCard, setP1PendingCard] = useState<GameCard | null>(null);
  const [p2PendingCard, setP2PendingCard] = useState<GameCard | null>(null);
  const [warFaceDownChosen, setWarFaceDownChosen] = useState(false);
  const [warP1DeciderChosen, setWarP1DeciderChosen] = useState(false);
  const [warP2DeciderChosen, setWarP2DeciderChosen] = useState(false);
  const [warP1PendingDecider, setWarP1PendingDecider] = useState<GameCard | null>(null);
  const [warP2PendingDecider, setWarP2PendingDecider] = useState<GameCard | null>(null);

  // Animations
  const [flyingCards, setFlyingCards] = useState<FlyingCardEntry[]>([]);
  const [cardPicker, setCardPicker] = useState<CardPickerState | null>(null);
  const [p1StackBouncing, setP1StackBouncing] = useState(false);
  const [p2StackBouncing, setP2StackBouncing] = useState(false);
  const [probAnimating, setProbAnimating] = useState(false);
  const [capturingCards] = useState(false);
  const [showWarBanner, setShowWarBanner] = useState(false);

  // Auto-play
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs
  const p1StackRef = useRef<HTMLDivElement>(null);
  const p2StackRef = useRef<HTMLDivElement>(null);
  const p1CardSlotRef = useRef<HTMLDivElement>(null);
  const p2CardSlotRef = useRef<HTMLDivElement>(null);

  // flyIdRef reserved for future flying card orchestration
  // const flyIdRef = useRef(0);
  const solverDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ===== AUTO-PLAY =====
  const handleAutoPlay = useCallback(() => {
    setIsAutoPlaying(true);
  }, []);

  const handleStopAutoPlay = useCallback(() => {
    setIsAutoPlaying(false);
    if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
  }, []);

  // ===== SOLVER =====
  const runProbUpdate = useCallback(async (h1: PlayerHandState, h2: PlayerHandState) => {
    if (h1.totalCards === 0 || h2.totalCards === 0) return;
    // Symmetry: identical rank distributions → exactly 50/50
    if (h1.totalCards === h2.totalCards) {
      const rc1 = makeRankCountsForSolver(h1);
      const rc2 = makeRankCountsForSolver(h2);
      const symmetric = ALL_RANKS.every(r => rc1[r] === rc2[r]);
      if (symmetric) {
        setProbAnimating(true);
        setP1(prev => ({ ...prev, prevWinProb: prev.winProb, winProb: 0.5, delta: 0.5 - prev.winProb, expectedRounds: prev.expectedRounds }));
        setP2(prev => ({ ...prev, prevWinProb: prev.winProb, winProb: 0.5, delta: 0.5 - prev.winProb, expectedRounds: prev.expectedRounds }));
        setTimeout(() => setProbAnimating(false), 900);
        return;
      }
    }
    try {
      const players: PlayerStateInput[] = [
        {
          id: h1.id,
          displayName: h1.name,
          handSize: h1.totalCards,
          orderMode: 'randomized-fixed',
          rankCounts: makeRankCountsForSolver(h1),
        },
        {
          id: h2.id,
          displayName: h2.name,
          handSize: h2.totalCards,
          orderMode: 'randomized-fixed',
          rankCounts: makeRankCountsForSolver(h2),
        },
      ];
      const result = await runSolver(players, DEFAULT_RULES, DEFAULT_SOLVER_CONFIG);
      const p1data = result.perPlayer.find(p => p.id === h1.id);
      const p2data = result.perPlayer.find(p => p.id === h2.id);
      if (!p1data || !p2data) return;

      // Normalize so probabilities always sum to 100%
      const rawSum = p1data.winProbability + p2data.winProbability;
      const norm = rawSum > 0 ? rawSum : 1;
      const p1prob = p1data.winProbability / norm;
      const p2prob = p2data.winProbability / norm;

      setProbAnimating(true);
      setP1(prev => ({
        ...prev,
        prevWinProb: prev.winProb,
        winProb: p1prob,
        delta: p1prob - prev.winProb,
        expectedRounds: p1data.expectedRemainingRounds,
      }));
      setP2(prev => ({
        ...prev,
        prevWinProb: prev.winProb,
        winProb: p2prob,
        delta: p2prob - prev.winProb,
        expectedRounds: p2data.expectedRemainingRounds,
      }));
      setTimeout(() => setProbAnimating(false), 900);
    } catch (e) {
      console.error('Solver error:', e);
    }
  }, []);

  const debouncedSolve = useCallback((h1: PlayerHandState, h2: PlayerHandState) => {
    if (solverDebounceRef.current) clearTimeout(solverDebounceRef.current);
    solverDebounceRef.current = setTimeout(() => runProbUpdate(h1, h2), 300);
  }, [runProbUpdate]);

  // Run solver on mount
  useEffect(() => {
    runProbUpdate(p1, p2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-play effect
  useEffect(() => {
    if (!isAutoPlaying) return;

    if (phase === 'game_over') {
      setIsAutoPlaying(false);
      return;
    }

    let fn: (() => void) | null = null;
    if (phase === 'choosing') {
      fn = handlePlayRandom;
    } else if (phase === 'revealed' || phase === 'war_revealed' || phase === 'round_end') {
      fn = handleNextRound;
    } else if (phase === 'war_setup' || phase === 'war_facedown') {
      fn = handleWarFaceDownRandom;
    } else if (phase === 'war_deciding') {
      fn = handleWarDecidingRandom;
    }
    // Other phases (animating etc): do nothing, wait for next render

    if (fn) {
      autoPlayRef.current = setTimeout(fn, 80);
    }

    return () => {
      if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoPlaying, phase]);

  // ===== HAND MANAGEMENT =====
  const deductCard = (hand: PlayerHandState, rank: Rank): PlayerHandState => {
    const idx = hand.cards.findIndex(c => c.rank === rank);
    const newCards = [...hand.cards];
    if (idx >= 0) newCards.splice(idx, 1);
    const newCounts = { ...hand.rankCounts };
    const c = hand.rankCounts[rank];
    if (c !== null && (c as number) > 0) {
      newCounts[rank] = (c as number) - 1;
    }
    const newUnknown = idx < 0 ? Math.max(0, hand.unknownCount - 1) : hand.unknownCount;
    return { ...hand, cards: newCards, rankCounts: newCounts, unknownCount: newUnknown, totalCards: hand.totalCards - 1 };
  };

  const addCardsFromPot = (hand: PlayerHandState, wonCards: GameCard[]): PlayerHandState => {
    const newCards = [...hand.cards, ...wonCards.map(c => ({ ...c, faceUp: false }))];
    const newCounts = { ...hand.rankCounts };
    for (const c of wonCards) {
      newCounts[c.rank] = ((newCounts[c.rank] as number) ?? 0) + 1;
    }
    return { ...hand, cards: newCards, rankCounts: newCounts, unknownCount: hand.unknownCount, totalCards: hand.totalCards + wonCards.length };
  };

  // ===== FLYING CARD HELPERS =====
  const bounceStack = (who: 'p1' | 'p2') => {
    if (who === 'p1') {
      setP1StackBouncing(true);
      setTimeout(() => setP1StackBouncing(false), 600);
    } else {
      setP2StackBouncing(true);
      setTimeout(() => setP2StackBouncing(false), 600);
    }
  };

  // ===== GAME FLOW =====
  const handleStartGame = () => {
    setIsAutoPlaying(false);
    if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
    setPhase('choosing');
    setRoundNumber(1);
    setPotSize(0);
    setPotCards([]);
    setP1Card(null);
    setP2Card(null);
    setP1WarFaceDown([]);
    setP2WarFaceDown([]);
    setP1WarDecider(null);
    setP2WarDecider(null);
    setResultMessage('');
    setWinnerId(null);
    setIsWar(false);
    setP1Chosen(false);
    setP2Chosen(false);
    setP1PendingCard(null);
    setP2PendingCard(null);
    setWarFaceDownChosen(false);
    setWarP1DeciderChosen(false);
    setWarP2DeciderChosen(false);
  };

  const playCards = useCallback((card1: GameCard, card2: GameCard, h1: PlayerHandState, h2: PlayerHandState) => {
    setPhase('animating');
    setP1Card({ ...card1, faceUp: false });
    setP2Card({ ...card2, faceUp: false });

    // Fly from stacks to slots
    setTimeout(() => {
      // Reveal
      setP1Card({ ...card1, faceUp: true });
      setP2Card({ ...card2, faceUp: true });

      // Compare after a beat
      setTimeout(() => {
        compareCards(card1, card2, h1, h2, 0);
      }, 500);
    }, 400);
  }, []);

  const compareCards = useCallback((
    card1: GameCard,
    card2: GameCard,
    h1: PlayerHandState,
    h2: PlayerHandState,
    currentPot: number
  ) => {
    const v1 = RANK_VALUES[card1.rank];
    const v2 = RANK_VALUES[card2.rank];
    const newPot = currentPot + 2;

    if (v1 > v2) {
      // P1 wins
      setResultMessage(`${h1.name} wins this round! 🎉`);
      setWinnerId(h1.id);
      setPotSize(newPot);
      setPhase('revealed');
      // Update hands after capture
      setTimeout(() => {
        const wonCards = [...potCards, card1, card2];
        const updated1 = addCardsFromPot(h1, wonCards);
        setP1(updated1);
        setP2(h2);
        setPotCards([]);
        bounceStack('p1');
        debouncedSolve(updated1, h2);
      }, 100);
    } else if (v2 > v1) {
      // P2 wins
      setResultMessage(`${h2.name} wins this round! 🎉`);
      setWinnerId(h2.id);
      setPotSize(newPot);
      setPhase('revealed');
      setTimeout(() => {
        const wonCards = [...potCards, card1, card2];
        const updated2 = addCardsFromPot(h2, wonCards);
        setP2(updated2);
        setP1(h1);
        setPotCards([]);
        bounceStack('p2');
        debouncedSolve(h1, updated2);
      }, 100);
    } else {
      // WAR! Track the played cards in the pot
      setPotCards(prev => [...prev, card1, card2]);
      setIsWar(true);
      setPotSize(newPot);
      setShowWarBanner(true);
      setTimeout(() => setShowWarBanner(false), 2000);
      setTimeout(() => {
        setPhase('war_setup');
        setWarFaceDownChosen(false);
        setWarP1DeciderChosen(false);
        setWarP2DeciderChosen(false);
        setP1WarFaceDown([]);
        setP2WarFaceDown([]);
        setP1WarDecider(null);
        setP2WarDecider(null);
      }, 1500);
    }
  }, [debouncedSolve]);

  // ===== CARD SELECTION =====
  const pickRandomCard = (hand: PlayerHandState): [GameCard, PlayerHandState] => {
    if (hand.cards.length > 0) {
      const idx = Math.floor(Math.random() * hand.cards.length);
      const card = { ...hand.cards[idx], faceUp: false };
      const newHand = deductCard(hand, card.rank);
      return [card, newHand];
    }
    // Fallback: pick random rank from counts
    const rank = randomRank(hand.rankCounts, hand.unknownCount);
    const suit = randomSuit();
    const card: GameCard = { rank, suit, faceUp: false };
    return [card, deductCard(hand, rank)];
  };

  const handlePlayRandom = () => {
    const [card1, newH1] = pickRandomCard(p1);
    const [card2, newH2] = pickRandomCard(p2);
    setP1(newH1);
    setP2(newH2);
    setP1Chosen(false);
    setP2Chosen(false);
    playCards(card1, card2, newH1, newH2);
  };

  const handleP1Choose = () => {
    setCardPicker({ visible: true, playerId: 'p1', context: 'main' });
  };

  const handleP2Choose = () => {
    setCardPicker({ visible: true, playerId: 'p2', context: 'main' });
  };

  const handleCardPickerPick = (rank: Rank) => {
    if (!cardPicker) return;
    const suit = randomSuit();
    const card: GameCard = { rank, suit, faceUp: false };

    if (cardPicker.context === 'main') {
      if (cardPicker.playerId === 'p1') {
        const newH1 = deductCard(p1, rank);
        setP1(newH1);
        setP1PendingCard(card);
        setP1Chosen(true);
        // If P2 already chosen, play
        if (p2Chosen && p2PendingCard) {
          playCards(card, p2PendingCard, newH1, p2);
          setP2Chosen(false);
          setP2PendingCard(null);
        }
      } else {
        const newH2 = deductCard(p2, rank);
        setP2(newH2);
        setP2PendingCard(card);
        setP2Chosen(true);
        // If P1 already chosen, play
        if (p1Chosen && p1PendingCard) {
          playCards(p1PendingCard, card, p1, newH2);
          setP1Chosen(false);
          setP1PendingCard(null);
        }
      }
    } else if (cardPicker.context === 'war_decider') {
      if (cardPicker.playerId === 'p1') {
        const newH1 = deductCard(p1, rank);
        setP1(newH1);
        setWarP1PendingDecider(card);
        setWarP1DeciderChosen(true);
        if (warP2DeciderChosen && warP2PendingDecider) {
          playWarDeciders(card, warP2PendingDecider, newH1, p2);
        }
      } else {
        const newH2 = deductCard(p2, rank);
        setP2(newH2);
        setWarP2PendingDecider(card);
        setWarP2DeciderChosen(true);
        if (warP1DeciderChosen && warP1PendingDecider) {
          playWarDeciders(warP1PendingDecider, card, p1, newH2);
        }
      }
    }
    setCardPicker(null);
  };

  const handleCardPickerRandom = () => {
    if (!cardPicker) return;
    if (cardPicker.context === 'main') {
      if (cardPicker.playerId === 'p1') {
        const [card, newH1] = pickRandomCard(p1);
        setP1(newH1);
        setP1PendingCard(card);
        setP1Chosen(true);
        if (p2Chosen && p2PendingCard) {
          playCards(card, p2PendingCard, newH1, p2);
          setP2Chosen(false);
          setP2PendingCard(null);
        }
      } else {
        const [card, newH2] = pickRandomCard(p2);
        setP2(newH2);
        setP2PendingCard(card);
        setP2Chosen(true);
        if (p1Chosen && p1PendingCard) {
          playCards(p1PendingCard, card, p1, newH2);
          setP1Chosen(false);
          setP1PendingCard(null);
        }
      }
    } else if (cardPicker.context === 'war_decider') {
      if (cardPicker.playerId === 'p1') {
        const [card, newH1] = pickRandomCard(p1);
        setP1(newH1);
        setWarP1PendingDecider(card);
        setWarP1DeciderChosen(true);
        if (warP2DeciderChosen && warP2PendingDecider) {
          playWarDeciders(card, warP2PendingDecider, newH1, p2);
        }
      } else {
        const [card, newH2] = pickRandomCard(p2);
        setP2(newH2);
        setWarP2PendingDecider(card);
        setWarP2DeciderChosen(true);
        if (warP1DeciderChosen && warP1PendingDecider) {
          playWarDeciders(warP1PendingDecider, card, p1, newH2);
        }
      }
    }
    setCardPicker(null);
  };

  // ===== WAR FLOW =====
  const handleWarFaceDownRandom = useCallback(() => {
    setPhase('war_facedown');
    setWarFaceDownChosen(true);

    // Pick 3 random cards each
    let h1 = p1;
    let h2 = p2;
    const fd1: GameCard[] = [];
    const fd2: GameCard[] = [];

    for (let i = 0; i < 3; i++) {
      if (h1.totalCards > 1) {
        const [c, nh] = pickRandomCard(h1);
        fd1.push({ ...c, faceUp: false });
        h1 = nh;
      }
      if (h2.totalCards > 1) {
        const [c, nh] = pickRandomCard(h2);
        fd2.push({ ...c, faceUp: false });
        h2 = nh;
      }
    }

    setP1WarFaceDown(fd1);
    setP2WarFaceDown(fd2);
    setP1(h1);
    setP2(h2);
    setPotCards(prev => [...prev, ...fd1, ...fd2]);
    setPotSize(prev => prev + fd1.length + fd2.length);

    setTimeout(() => {
      setPhase('war_deciding');
    }, 800);
  }, [p1, p2]);

  const playWarDeciders = useCallback((
    dec1: GameCard,
    dec2: GameCard,
    h1: PlayerHandState,
    h2: PlayerHandState
  ) => {
    setPhase('war_animating');
    // Show face-down then reveal
    setTimeout(() => {
      setP1WarDecider({ ...dec1, faceUp: true });
      setP2WarDecider({ ...dec2, faceUp: true });

      setTimeout(() => {
        // Compare
        const v1 = RANK_VALUES[dec1.rank];
        const v2 = RANK_VALUES[dec2.rank];
        const newPot = potSize + 2; // +2 for the two deciders

        if (v1 > v2) {
          setResultMessage(`${h1.name} wins the WAR! 🏆`);
          setWinnerId(h1.id);
          setPotSize(newPot);
          setPhase('war_revealed');
          setTimeout(() => {
            setPotCards(prev => {
              const allWon = [...prev, dec1, dec2];
              const updated1 = addCardsFromPot(h1, allWon);
              setP1(updated1);
              setP2(h2);
              bounceStack('p1');
              debouncedSolve(updated1, h2);
              return [];
            });
          }, 100);
        } else if (v2 > v1) {
          setResultMessage(`${h2.name} wins the WAR! 🏆`);
          setWinnerId(h2.id);
          setPotSize(newPot);
          setPhase('war_revealed');
          setTimeout(() => {
            setPotCards(prev => {
              const allWon = [...prev, dec1, dec2];
              const updated2 = addCardsFromPot(h2, allWon);
              setP2(updated2);
              setP1(h1);
              bounceStack('p2');
              debouncedSolve(h1, updated2);
              return [];
            });
          }, 100);
        } else {
          // Another war!
          setIsWar(true);
          setPotSize(newPot);
          setShowWarBanner(true);
          setTimeout(() => setShowWarBanner(false), 2000);
          setTimeout(() => {
            setPhase('war_setup');
            setWarFaceDownChosen(false);
            setWarP1DeciderChosen(false);
            setWarP2DeciderChosen(false);
            setP1WarFaceDown([]);
            setP2WarFaceDown([]);
            setP1WarDecider(null);
            setP2WarDecider(null);
          }, 1500);
        }
      }, 600);
    }, 300);
  }, [potSize, debouncedSolve]);

  const handleWarDecidingRandom = useCallback(() => {
    const [dec1, newH1] = pickRandomCard(p1);
    const [dec2, newH2] = pickRandomCard(p2);
    setP1(newH1);
    setP2(newH2);
    setWarP1DeciderChosen(true);
    setWarP2DeciderChosen(true);
    setWarP1PendingDecider(dec1);
    setWarP2PendingDecider(dec2);
    playWarDeciders(dec1, dec2, newH1, newH2);
  }, [p1, p2, playWarDeciders]);

  const handleWarP1Choose = () => {
    setCardPicker({ visible: true, playerId: 'p1', context: 'war_decider' });
  };

  const handleWarP2Choose = () => {
    setCardPicker({ visible: true, playerId: 'p2', context: 'war_decider' });
  };

  // ===== NEXT ROUND =====
  const handleNextRound = useCallback(() => {
    // Check if game over
    if (p1.totalCards === 0 || p2.totalCards === 0) {
      setPhase('game_over');
      return;
    }

    setPhase('choosing');
    setRoundNumber(prev => prev + 1);
    setP1Card(null);
    setP2Card(null);
    setP1WarFaceDown([]);
    setP2WarFaceDown([]);
    setP1WarDecider(null);
    setP2WarDecider(null);
    setResultMessage('');
    setWinnerId(null);
    setIsWar(false);
    setPotSize(0);
    setPotCards([]);
    setP1Chosen(false);
    setP2Chosen(false);
    setP1PendingCard(null);
    setP2PendingCard(null);
    setWarFaceDownChosen(false);
    setWarP1DeciderChosen(false);
    setWarP2DeciderChosen(false);
    setWarP1PendingDecider(null);
    setWarP2PendingDecider(null);
  }, [p1.totalCards, p2.totalCards]);

  // ===== RANK EDITOR CALLBACKS =====
  const handleP1RankChange = (rank: Rank, value: number | null) => {
    setP1(prev => {
      const newCounts = { ...prev.rankCounts, [rank]: value };
      const knownTotal = ALL_RANKS.reduce((s, r) => s + (newCounts[r] ?? 0), 0);
      const newTotal = knownTotal + prev.unknownCount;
      const updated = { ...prev, rankCounts: newCounts, totalCards: newTotal };
      debouncedSolve(updated, p2);
      return updated;
    });
  };

  const handleP2RankChange = (rank: Rank, value: number | null) => {
    setP2(prev => {
      const newCounts = { ...prev.rankCounts, [rank]: value };
      const knownTotal = ALL_RANKS.reduce((s, r) => s + (newCounts[r] ?? 0), 0);
      const newTotal = knownTotal + prev.unknownCount;
      const updated = { ...prev, rankCounts: newCounts, totalCards: newTotal };
      debouncedSolve(p1, updated);
      return updated;
    });
  };

  const handleP1SetFullDeck = () => {
    const counts: Record<Rank, number | null> = {} as Record<Rank, number | null>;
    for (const r of ALL_RANKS) counts[r] = 2;
    const updated = { ...p1, rankCounts: counts, unknownCount: 0, totalCards: 26 };
    setP1(updated);
    debouncedSolve(updated, p2);
  };

  const handleP2SetFullDeck = () => {
    const counts: Record<Rank, number | null> = {} as Record<Rank, number | null>;
    for (const r of ALL_RANKS) counts[r] = 2;
    const updated = { ...p2, rankCounts: counts, unknownCount: 0, totalCards: 26 };
    setP2(updated);
    debouncedSolve(p1, updated);
  };

  const handleP1SetAllUnknown = () => {
    const counts: Record<Rank, number | null> = {} as Record<Rank, number | null>;
    for (const r of ALL_RANKS) counts[r] = null;
    const updated = { ...p1, rankCounts: counts, unknownCount: p1.totalCards };
    setP1(updated);
    debouncedSolve(updated, p2);
  };

  const handleP2SetAllUnknown = () => {
    const counts: Record<Rank, number | null> = {} as Record<Rank, number | null>;
    for (const r of ALL_RANKS) counts[r] = null;
    const updated = { ...p2, rankCounts: counts, unknownCount: p2.totalCards };
    setP2(updated);
    debouncedSolve(p1, updated);
  };

  const handlePlayAgain = () => {
    const [c1, c2] = dealDeck();
    const fresh1 = makeHandFromCards(c1, 'player1', p1.name);
    const fresh2 = makeHandFromCards(c2, 'player2', p2.name);
    setP1(fresh1);
    setP2(fresh2);
    setPhase('setup');
    setRoundNumber(0);
    setPotSize(0);
    setP1Card(null);
    setP2Card(null);
    setP1WarFaceDown([]);
    setP2WarFaceDown([]);
    setP1WarDecider(null);
    setP2WarDecider(null);
    setResultMessage('');
    setWinnerId(null);
    setIsWar(false);
    setPotCards([]);
    runProbUpdate(fresh1, fresh2);
  };

  const gameWinnerId = phase === 'game_over'
    ? (p1.totalCards === 0 ? p2.id : p1.id)
    : null;
  const gameWinner = gameWinnerId === p1.id ? p1 : gameWinnerId === p2.id ? p2 : null;

  return (
    <div className="poker-app">
      {/* Atmospheric floating particles */}
      <div className="particle particle-1" />
      <div className="particle particle-2" />
      <div className="particle particle-3" />
      <div className="particle particle-4" />
      <div className="particle particle-5" />
      <div className="particle particle-6" />
      <div className="particle particle-7" />
      <div className="particle particle-8" />

      <div className="table-wrapper">
        <div className="table-felt">
          {/* P1 - left side */}
          <PlayerArea
            player={p1}
            side="left"
            accentClass="accent-a"
            accentColor="#38BDF8"
            stackRef={p1StackRef}
            onRankCountChange={handleP1RankChange}
            onSetFullDeck={handleP1SetFullDeck}
            onSetAllUnknown={handleP1SetAllUnknown}
            probAnimating={probAnimating}
            stackBouncing={p1StackBouncing}
            disabled={phase !== 'setup' && phase !== 'choosing'}
            onNameChange={(name) => setP1(prev => ({ ...prev, name }))}
            onViewDeck={() => setShowDeckViewer('p1')}
          />

          {/* Center */}
          <CenterTable
            phase={phase}
            p1Card={p1Card}
            p2Card={p2Card}
            p1WarFaceDown={p1WarFaceDown}
            p2WarFaceDown={p2WarFaceDown}
            p1WarDecider={p1WarDecider}
            p2WarDecider={p2WarDecider}
            potSize={potSize}
            resultMessage={resultMessage}
            roundNumber={roundNumber}
            isWar={isWar}
            capturing={capturingCards}
            p1Delta={p1.delta}
            p2Delta={p2.delta}
            p1CardSlotRef={p1CardSlotRef}
            p2CardSlotRef={p2CardSlotRef}
            onPlayRandom={handlePlayRandom}
            onP1Choose={handleP1Choose}
            onP2Choose={handleP2Choose}
            onWarFaceDownRandom={handleWarFaceDownRandom}
            onWarDecidingRandom={handleWarDecidingRandom}
            onWarP1Choose={handleWarP1Choose}
            onWarP2Choose={handleWarP2Choose}
            onNextRound={handleNextRound}
            onStartGame={handleStartGame}
            p1Name={p1.name}
            p2Name={p2.name}
            p1HasCards={p1.totalCards > 0}
            p2HasCards={p2.totalCards > 0}
            p1Chosen={p1Chosen}
            p2Chosen={p2Chosen}
            warFaceDownChosen={warFaceDownChosen}
            warP1DeciderChosen={warP1DeciderChosen}
            warP2DeciderChosen={warP2DeciderChosen}
            isAutoPlaying={isAutoPlaying}
            onAutoPlay={handleAutoPlay}
            onStopAutoPlay={handleStopAutoPlay}
          />

          {/* P2 - right side */}
          <PlayerArea
            player={p2}
            side="right"
            accentClass="accent-b"
            accentColor="#A78BFA"
            stackRef={p2StackRef}
            onRankCountChange={handleP2RankChange}
            onSetFullDeck={handleP2SetFullDeck}
            onSetAllUnknown={handleP2SetAllUnknown}
            probAnimating={probAnimating}
            stackBouncing={p2StackBouncing}
            disabled={phase !== 'setup' && phase !== 'choosing'}
            onNameChange={(name) => setP2(prev => ({ ...prev, name }))}
            onViewDeck={() => setShowDeckViewer('p2')}
          />

          {/* WAR banner overlay */}
          <WarBanner visible={showWarBanner} />

          {/* Deck viewer modals */}
          <DeckViewer
            playerName={p1.name}
            accentColor="#38BDF8"
            cards={p1.cards}
            open={showDeckViewer === 'p1'}
            onClose={() => setShowDeckViewer(null)}
          />
          <DeckViewer
            playerName={p2.name}
            accentColor="#A78BFA"
            cards={p2.cards}
            open={showDeckViewer === 'p2'}
            onClose={() => setShowDeckViewer(null)}
          />

          {/* Winner banner */}
          {phase === 'game_over' && gameWinner && (
            <WinnerBanner
              winnerName={gameWinner.name}
              accentColor={gameWinner.id === p1.id ? '#38BDF8' : '#A78BFA'}
              onPlayAgain={handlePlayAgain}
            />
          )}
        </div>
      </div>

      {/* Flying cards overlay */}
      {flyingCards.map(fc => (
        <FlyingCard
          key={fc.id}
          card={fc.card}
          fromRect={fc.fromRect}
          toRect={fc.toRect}
          onComplete={() => setFlyingCards(prev => prev.filter(f => f.id !== fc.id))}
          delay={fc.delay}
        />
      ))}

      {/* Card picker modal */}
      {cardPicker?.visible && (
        <CardPicker
          playerName={cardPicker.playerId === 'p1' ? p1.name : p2.name}
          accentClass={cardPicker.playerId === 'p1' ? 'player-name accent-a' : 'player-name accent-b'}
          rankCounts={cardPicker.playerId === 'p1' ? p1.rankCounts : p2.rankCounts}
          unknownCount={cardPicker.playerId === 'p1' ? p1.unknownCount : p2.unknownCount}
          onPick={handleCardPickerPick}
          onRandom={handleCardPickerRandom}
          onClose={() => setCardPicker(null)}
        />
      )}
    </div>
  );
}
