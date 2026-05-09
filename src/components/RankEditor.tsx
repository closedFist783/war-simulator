import type { Rank } from './CardComponent';

const ALL_RANKS: Rank[] = ['A','K','Q','J','10','9','8','7','6','5','4','3','2'];

interface RankEditorProps {
  playerName: string;
  accentClass: string;
  rankCounts: Record<Rank, number | null>; // null = unknown
  unknownCount: number;
  totalCards: number;
  onChangeRankCount: (rank: Rank, value: number | null) => void;
  onSetFullDeck: () => void;
  onSetAllUnknown: () => void;
  onClose: () => void;
}

export function RankEditor({
  playerName,
  accentClass,
  rankCounts,
  unknownCount,
  totalCards,
  onChangeRankCount,
  onSetFullDeck,
  onSetAllUnknown,
  onClose,
}: RankEditorProps) {
  const knownTotal = ALL_RANKS.reduce((sum, r) => sum + (rankCounts[r] ?? 0), 0);
  const effectiveTotal = knownTotal + unknownCount;

  return (
    <div className="popover-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="popover-box">
        <button className="popover-close" onClick={onClose}>✕</button>
        <div className="popover-title">
          Edit <span className={accentClass}>{playerName}</span>'s Hand
        </div>

        <div className="edit-shortcuts">
          <button className="btn btn-small btn-secondary" onClick={onSetFullDeck}>Half deck (26)</button>
          <button className="btn btn-small btn-secondary" onClick={onSetAllUnknown}>All unknown</button>
        </div>

        <div className="rank-grid">
          {ALL_RANKS.map((rank) => {
            const isUnknown = rankCounts[rank] === null;
            const count = rankCounts[rank] ?? 0;

            return (
              <div key={rank} className="rank-item">
                <span className="rank-label">{rank}</span>
                <input
                  type="number"
                  className="rank-input"
                  min={0}
                  max={4}
                  value={isUnknown ? '' : count}
                  placeholder={isUnknown ? '?' : ''}
                  disabled={isUnknown}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v) && v >= 0 && v <= 4) {
                      onChangeRankCount(rank, v);
                    }
                  }}
                />
                <button
                  className={`rank-unknown-btn ${isUnknown ? 'active' : ''}`}
                  onClick={() => onChangeRankCount(rank, isUnknown ? 0 : null)}
                >
                  ?
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 12, color: '#64748B', marginBottom: 16, textAlign: 'center' }}>
          Total: {effectiveTotal} cards ({knownTotal} known + {unknownCount} unknown)
          {effectiveTotal !== totalCards && (
            <span style={{ color: '#F87171' }}> ≠ expected {totalCards}</span>
          )}
        </div>

        <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
