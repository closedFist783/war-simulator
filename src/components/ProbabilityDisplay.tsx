import { useEffect, useRef, useState } from 'react';

interface ProbabilityDisplayProps {
  winProb: number;
  prevWinProb: number;
  delta: number;
  expectedRounds: number;
  accentClass: string;
  animating?: boolean;
}

function useTweenNumber(target: number, duration: number = 600): number {
  const [displayed, setDisplayed] = useState(target);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<{ start: number; from: number; to: number } | null>(null);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const from = displayed;
    const to = target;
    if (Math.abs(from - to) < 0.001) return;

    const startTime = performance.now();
    startRef.current = { start: startTime, from, to };

    const animate = (now: number) => {
      if (!startRef.current) return;
      const elapsed = now - startRef.current.start;
      const t = Math.min(elapsed / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setDisplayed(startRef.current.from + (startRef.current.to - startRef.current.from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return displayed;
}

export function ProbabilityDisplay({
  winProb,
  delta,
  expectedRounds,
  accentClass,
  animating,
}: ProbabilityDisplayProps) {
  const tweened = useTweenNumber(winProb * 100, animating ? 800 : 200);
  const [flashClass, setFlashClass] = useState('');

  useEffect(() => {
    if (Math.abs(delta) < 0.0001) return;
    const cls = delta > 0 ? 'prob-flash-green' : 'prob-flash-red';
    setFlashClass(cls);
    const t = setTimeout(() => setFlashClass(''), 900);
    return () => clearTimeout(t);
  }, [delta, winProb]);

  const deltaSign = delta >= 0 ? '+' : '';
  const deltaClass = delta > 0.0001 ? 'positive' : delta < -0.0001 ? 'negative' : 'neutral';

  function formatProb(val: number): string {
    if (val <= 0) return '0.000%';
    if (val >= 100) return '100.0%';
    if (val < 0.1) return val.toFixed(3) + '%';
    if (val < 1) return val.toFixed(2) + '%';
    if (val > 99.9) return val.toFixed(3) + '%';
    if (val > 99) return val.toFixed(2) + '%';
    return val.toFixed(1) + '%';
  }

  return (
    <div className="prob-display">
      <div className={`prob-main ${accentClass} ${flashClass}`}>
        {formatProb(tweened)}
      </div>
      {Math.abs(delta) > 0.0001 && (
        <div className={`prob-delta ${deltaClass}`}>
          {deltaSign}{(delta * 100).toFixed(1)}%
        </div>
      )}
      {!isNaN(expectedRounds) && expectedRounds > 0 && isFinite(expectedRounds) && (
        <div className="prob-rounds">~{Math.round(expectedRounds)} rounds left</div>
      )}
    </div>
  );
}
