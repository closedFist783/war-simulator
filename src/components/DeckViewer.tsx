import { CardComponent } from './CardComponent';
import type { GameCard } from './CardComponent';

interface DeckViewerProps {
  playerName: string;
  accentColor: string;
  cards: GameCard[];
  onClose: () => void;
}

export function DeckViewer({ playerName, accentColor, cards, onClose }: DeckViewerProps) {
  const RANK_ORDER = ['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
  const SUIT_ORDER = ['♠','♣','♥','♦'];
  const sorted = [...cards].sort((a, b) => {
    const ri = RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank);
    if (ri !== 0) return ri;
    return SUIT_ORDER.indexOf(a.suit ?? '') - SUIT_ORDER.indexOf(b.suit ?? '');
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <span style={{ color: accentColor, fontWeight: 800 }}>{playerName}'s Hand</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{cards.length} cards</span>
          <button className="btn-gear" onClick={onClose} style={{ marginLeft: 'auto' }}>✕</button>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))',
          gap: 6,
          padding: '12px 0',
          maxHeight: 420,
          overflowY: 'auto',
        }}>
          {sorted.map((card, i) => (
            <CardComponent key={i} card={{ ...card, faceUp: true }} style={{ transform: 'scale(0.8)', transformOrigin: 'top left' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
