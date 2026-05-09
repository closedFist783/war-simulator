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
      <DialogContent className="max-w-[480px] p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-white/10">
          <DialogTitle className="flex items-center gap-3">
            <span style={{ color: accentColor, fontWeight: 800, fontSize: 18 }}>
              {playerName}'s Hand
            </span>
            <span style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.5)',
              borderRadius: 20,
              padding: '2px 10px',
              fontSize: 12,
              fontWeight: 600,
            }}>
              {cards.length} cards
            </span>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[440px]">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
            padding: '16px 20px 20px',
          }}>
            {sorted.map((card, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'center' }}>
                <CardComponent card={{ ...card, faceUp: true }} />
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
