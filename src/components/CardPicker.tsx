import type { Rank } from './CardComponent';

const ALL_RANKS: Rank[] = ['A','K','Q','J','10','9','8','7','6','5','4','3','2'];

interface CardPickerProps {
  playerName: string;
  accentClass: string;
  rankCounts: Record<Rank, number | null>; // null = unknown
  unknownCount: number;
  onPick: (rank: Rank) => void;
  onRandom: () => void;
  onClose: () => void;
}

export function CardPicker({
  playerName,
  accentClass,
  rankCounts,
  unknownCount,
  onPick,
  onRandom,
  onClose,
}: CardPickerProps) {
  return (
    <div className="popover-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="popover-box">
        <button className="popover-close" onClick={onClose}>✕</button>
        <div className="popover-title">
          <span className={accentClass}>{playerName}</span> — Choose a Card
        </div>

        <div className="card-picker-grid">
          {ALL_RANKS.map((rank) => {
            const count = rankCounts[rank];
            const available = count === null ? unknownCount > 0 : (count ?? 0) > 0;
            const displayCount = count === null ? '?' : (count ?? 0);

            return (
              <button
                key={rank}
                className="rank-pick-btn"
                disabled={!available}
                onClick={() => { onPick(rank); onClose(); }}
              >
                <span className="rp-rank">{rank}</span>
                <span className="rp-count">{displayCount}</span>
              </button>
            );
          })}
        </div>

        {unknownCount > 0 && (
          <div style={{ marginBottom: 12, fontSize: 12, color: '#64748B', textAlign: 'center' }}>
            {unknownCount} unknown card{unknownCount !== 1 ? 's' : ''} in hand
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { onRandom(); onClose(); }}>
            🎲 Random
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
