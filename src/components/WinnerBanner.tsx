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
  const [particles] = useState<Particle[]>(() => makeParticles(50));

  useEffect(() => {
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
      <div className="winner-banner-card" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🏆</div>
        <div
          className="winner-text"
          style={{ color: accentColor }}
        >
          {winnerName} Wins!
        </div>
        <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.5)', fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>
          The war is over
        </div>
        <button
          className="btn btn-primary"
          style={{ marginTop: 28, padding: '12px 36px', fontSize: 15, letterSpacing: '0.03em' }}
          onClick={onPlayAgain}
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
