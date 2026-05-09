import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
}

interface WinnerBannerProps {
  winnerName: string;
  accentColor: string;
  onPlayAgain: () => void;
}

const COLORS = ['#C9A84C', '#F59E0B', '#22C55E', '#38BDF8', '#A78BFA', '#F87171'];

function makeParticles(n: number): Particle[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: Math.random() * 1.5,
    duration: 1.5 + Math.random() * 2,
  }));
}

export function WinnerBanner({ winnerName, accentColor, onPlayAgain }: WinnerBannerProps) {
  const [particles] = useState<Particle[]>(() => makeParticles(40));

  useEffect(() => {
    // Prevent body scroll
    return () => {};
  }, []);

  return (
    <div className="winner-banner">
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: `${p.x}%`,
            top: 0,
            background: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <div style={{ fontSize: 60, marginBottom: 8 }}>🏆</div>
        <div
          className="winner-text"
          style={{ color: accentColor }}
        >
          {winnerName} Wins!
        </div>
        <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
          The war is over.
        </div>
        <button
          className="btn btn-primary"
          style={{ marginTop: 24, padding: '10px 28px', fontSize: 15 }}
          onClick={onPlayAgain}
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
