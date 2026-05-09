import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CardComponent } from './CardComponent';
import type { GameCard } from './CardComponent';

interface FlyingCardProps {
  card: GameCard;
  fromRect: DOMRect;
  toRect: DOMRect;
  onComplete: () => void;
  delay?: number;
}

export function FlyingCard({ card, fromRect, toRect, onComplete, delay = 0 }: FlyingCardProps) {
  const [phase, setPhase] = useState<'start' | 'flying' | 'done'>('start');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Delay before starting
    startRef.current = setTimeout(() => {
      setPhase('flying');

      // After transition completes, call onComplete
      timerRef.current = setTimeout(() => {
        setPhase('done');
        onComplete();
      }, 400);
    }, delay);

    return () => {
      if (startRef.current) clearTimeout(startRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onComplete, delay]);

  if (phase === 'done') return null;

  const fromX = fromRect.left + fromRect.width / 2 - 31.5; // center of 63px card
  const fromY = fromRect.top + fromRect.height / 2 - 44;   // center of 88px card
  const toX = toRect.left + toRect.width / 2 - 31.5;
  const toY = toRect.top + toRect.height / 2 - 44;

  const dx = toX - fromX;
  const dy = toY - fromY;

  const style: React.CSSProperties = {
    position: 'fixed',
    left: fromX,
    top: fromY,
    zIndex: 9999,
    pointerEvents: 'none',
    transition: phase === 'flying' ? 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
    transform: phase === 'flying' ? `translate(${dx}px, ${dy}px)` : 'translate(0, 0)',
    opacity: 1,
  };

  return createPortal(
    <div style={style}>
      <CardComponent card={card} />
    </div>,
    document.body
  );
}
