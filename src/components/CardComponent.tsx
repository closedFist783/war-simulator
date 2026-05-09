import React from 'react';

export type Suit = '♠' | '♣' | '♥' | '♦';
export type Rank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';

export interface GameCard {
  rank: Rank;
  suit: Suit;
  faceUp: boolean;
  id?: string;
}

interface CardProps {
  card?: GameCard | null;
  size?: 'normal' | 'large';
  className?: string;
  style?: React.CSSProperties;
  cardRef?: React.RefObject<HTMLDivElement | null>;
  placeholder?: boolean;
  winner?: boolean;
  hoverable?: boolean;
}

export function isRed(suit: Suit): boolean {
  return suit === '♥' || suit === '♦';
}

export function CardComponent({
  card,
  size = 'normal',
  className = '',
  style,
  cardRef,
  placeholder,
  winner,
  hoverable,
}: CardProps) {
  const sizeClass = size === 'large' ? 'card-large' : '';
  const hoverClass = hoverable ? 'card-hoverable' : '';

  if (!card || placeholder) {
    return (
      <div
        ref={cardRef}
        className={`playing-card card-placeholder ${sizeClass} ${className}`}
        style={style}
      />
    );
  }

  if (!card.faceUp) {
    return (
      <div
        ref={cardRef}
        className={`playing-card card-back ${sizeClass} ${hoverClass} ${className}`}
        style={style}
      />
    );
  }

  const red = isRed(card.suit);
  const colorClass = red ? 'card-red' : 'card-black';
  const winnerClass = winner ? 'card-winner' : '';

  return (
    <div
      ref={cardRef}
      className={`playing-card ${colorClass} ${sizeClass} ${winnerClass} ${hoverClass} card-flip ${className}`}
      style={style}
    >
      {/* Decorative inner frame */}
      <div className="card-inner-frame" />
      <div className="card-corner top-left">
        <span className="card-rank">{card.rank}</span>
        <span className="card-suit-small">{card.suit}</span>
      </div>
      <span className="card-center-suit">{card.suit}</span>
      <div className="card-corner bottom-right">
        <span className="card-rank">{card.rank}</span>
        <span className="card-suit-small">{card.suit}</span>
      </div>
    </div>
  );
}

/** Render a mini card back for stack layers */
export function CardBack({ style }: { style?: React.CSSProperties }) {
  return <div className="playing-card card-back" style={style} />;
}
