import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CardComponent } from './CardComponent';
import type { GameCard } from './CardComponent';

interface DeckViewerProps {
  playerName: string;
  accentColor: string;
  cards: GameCard[];
  open: boolean;
  onClose: () => void;
}

const RANK_ORDER = ['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
const SUIT_ORDER = ['♠','♣','♥','♦'];

export function DeckViewer({ playerName, accentColor, cards, open, onClose }: DeckViewerProps) {
  const sorted = [...cards].sort((a, b) => {
    const ri = RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank);
    if (ri !== 0) return ri;
    return SUIT_ORDER.indexOf(a.suit ?? '') - SUIT_ORDER.indexOf(b.suit ?? '');
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="max-w-[520px] p-0 overflow-hidden"
        style={{
          background: 'rgba(5, 8, 15, 0.97)',
          border: '1px solid rgba(201,168,76,0.3)',
          boxShadow: '0 0 60px rgba(201,168,76,0.2), 0 30px 80px rgba(0,0,0,0.8)',
          backdropFilter: 'blur(20px)',
          borderRadius: 20,
        }}
      >
        <DialogHeader
          className="px-6 pt-6 pb-4"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.15)' }}
        >
          <DialogTitle className="flex items-center gap-3">
            <span style={{ color: accentColor, fontWeight: 900, fontSize: 20, letterSpacing: '-0.02em', textShadow: `0 0 20px ${accentColor}` }}>
              {playerName}'s Hand
            </span>
            <span style={{
              background: 'rgba(201,168,76,0.12)',
              border: '1px solid rgba(201,168,76,0.3)',
              color: '#C9A84C',
              borderRadius: 20,
              padding: '3px 12px',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}>
              {cards.length} CARDS
            </span>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[480px]">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 10,
            padding: '20px 24px 24px',
          }}>
            {sorted.map((card, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'center' }}>
                <CardComponent card={{ ...card, faceUp: true }} hoverable />
              </div>
            ))}
            {sorted.length === 0 && (
              <div style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '40px 0',
                color: 'rgba(255,255,255,0.3)',
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}>
                No cards in hand
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
