import { useRef, useState } from 'react';
import type { GameCard, Rank } from './CardComponent';
import { ProbabilityDisplay } from './ProbabilityDisplay';
import { RankEditor } from './RankEditor';

export interface PlayerHandState {
  id: string;
  name: string;
  cards: GameCard[];
  rankCounts: Record<Rank, number | null>; // null = unknown rank
  unknownCount: number;
  totalCards: number;
  winProb: number;
  prevWinProb: number;
  delta: number;
  expectedRounds: number;
}

interface PlayerAreaProps {
  player: PlayerHandState;
  side: 'left' | 'right';
  accentClass: string;
  accentColor: string;
  stackRef: React.RefObject<HTMLDivElement | null>;
  onRankCountChange: (rank: Rank, value: number | null) => void;
  onSetFullDeck: () => void;
  onSetAllUnknown: () => void;
  probAnimating?: boolean;
  stackBouncing?: boolean;
  disabled?: boolean;
  onNameChange: (name: string) => void;
  onViewDeck?: () => void;
}

export function PlayerArea({
  player,
  side,
  accentClass,
  accentColor,
  stackRef,
  onRankCountChange,
  onSetFullDeck,
  onSetAllUnknown,
  probAnimating,
  stackBouncing,
  disabled,
  onNameChange,
  onViewDeck,
}: PlayerAreaProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(player.name);
  const [showEditor, setShowEditor] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const layers = Math.min(Math.max(1, Math.ceil(player.totalCards / 7)), 4);
  const sideClass = `player-${side}`;

  return (
    <div className={`player-area ${sideClass}`}>
      {/* Player name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {editingName ? (
          <input
            ref={nameRef}
            className="rank-input"
            style={{ width: 120, fontSize: 14, fontWeight: 700, color: accentColor }}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={() => {
              setEditingName(false);
              if (nameInput.trim()) onNameChange(nameInput.trim());
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                setEditingName(false);
                if (nameInput.trim()) onNameChange(nameInput.trim());
              }
            }}
            autoFocus
          />
        ) : (
          <div
            className={`player-name ${accentClass}`}
            style={{ cursor: 'pointer' }}
            onClick={() => { setNameInput(player.name); setEditingName(true); }}
            title="Click to rename"
          >
            {player.name}
          </div>
        )}
        <button
          className="btn-gear"
          title="Edit hand"
          disabled={disabled}
          onClick={() => setShowEditor(true)}
        >
          ⚙
        </button>
      </div>

      {/* Win probability */}
      <ProbabilityDisplay
        winProb={player.winProb}
        prevWinProb={player.prevWinProb}
        delta={player.delta}
        expectedRounds={player.expectedRounds}
        accentClass={`prob-main ${accentClass}`}
        animating={probAnimating}
      />

      {/* Card stack */}
      <div
        ref={stackRef}
        className={`card-stack-wrapper ${stackBouncing ? 'stack-bounce' : ''}`}
        onClick={() => onViewDeck?.()}
        style={{ cursor: player.cards.length > 0 ? 'pointer' : undefined }}
        title={player.cards.length > 0 ? 'View hand' : undefined}
      >
        {Array.from({ length: layers }, (_, i) => (
          <div
            key={i}
            className="card-stack-layer"
            style={{
              top: `${(layers - 1 - i) * 3}px`,
              left: `${(layers - 1 - i) * 3}px`,
            }}
          />
        ))}
        <span
          className="card-count-badge"
          style={{ borderColor: accentColor, color: accentColor }}
        >
          {player.totalCards}
        </span>
      </div>
      {player.cards.length > 0 && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2, cursor: 'pointer' }} onClick={() => onViewDeck?.()}>👁 View</div>
      )}

      {/* Hand size */}
      <div className="hand-size-display">
        {player.totalCards} cards
      </div>

      {/* Rank editor popover */}
      {showEditor && (
        <RankEditor
          playerName={player.name}
          accentClass={`player-name ${accentClass}`}
          rankCounts={player.rankCounts}
          unknownCount={player.unknownCount}
          totalCards={player.totalCards}
          onChangeRankCount={onRankCountChange}
          onSetFullDeck={onSetFullDeck}
          onSetAllUnknown={onSetAllUnknown}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}
