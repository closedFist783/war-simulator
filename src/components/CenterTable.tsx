import { CardComponent } from './CardComponent';
import type { GameCard } from './CardComponent';

export type GamePhase =
  | 'setup'
  | 'choosing'
  | 'animating'
  | 'revealed'
  | 'war_setup'
  | 'war_facedown'
  | 'war_animating'
  | 'war_deciding'
  | 'war_revealed'
  | 'capturing'
  | 'round_end'
  | 'game_over';

interface CenterTableProps {
  phase: GamePhase;
  p1Card: GameCard | null;
  p2Card: GameCard | null;
  p1WarFaceDown: GameCard[];
  p2WarFaceDown: GameCard[];
  p1WarDecider: GameCard | null;
  p2WarDecider: GameCard | null;
  potSize: number;
  resultMessage: string;
  roundNumber: number;
  isWar?: boolean;
  capturing?: boolean;

  // Refs for flying card source/target
  p1CardSlotRef: React.RefObject<HTMLDivElement | null>;
  p2CardSlotRef: React.RefObject<HTMLDivElement | null>;

  // Controls
  onPlayRandom: () => void;
  onP1Choose: () => void;
  onP2Choose: () => void;
  onWarFaceDownRandom: () => void;
  onWarDecidingRandom: () => void;
  onWarP1Choose: () => void;
  onWarP2Choose: () => void;
  onNextRound: () => void;
  onStartGame: () => void;

  p1Name: string;
  p2Name: string;
  p1HasCards: boolean;
  p2HasCards: boolean;

  // Which player has "chosen" in sequential mode
  p1Chosen: boolean;
  p2Chosen: boolean;
  warFaceDownChosen: boolean;
  warP1DeciderChosen: boolean;
  warP2DeciderChosen: boolean;
}

export function CenterTable({
  phase,
  p1Card,
  p2Card,
  p1WarFaceDown,
  p2WarFaceDown,
  p1WarDecider,
  p2WarDecider,
  potSize,
  resultMessage,
  roundNumber,
  p1CardSlotRef,
  p2CardSlotRef,
  onPlayRandom,
  onP1Choose,
  onP2Choose,
  onWarFaceDownRandom,
  onWarDecidingRandom,
  onWarP1Choose,
  onWarP2Choose,
  onNextRound,
  onStartGame,
  p1Name,
  p2Name,
  p1HasCards,
  p2HasCards,
  p1Chosen,
  p2Chosen,
  warFaceDownChosen,
  warP1DeciderChosen,
  warP2DeciderChosen,
}: CenterTableProps) {

  const renderBattleCards = () => {
    return (
      <div className="battle-row">
        {/* P1 card slot */}
        <div ref={p1CardSlotRef} style={{ minWidth: 63, minHeight: 88 }}>
          {p1Card ? (
            <CardComponent
              card={p1Card}
              className={p1Card.faceUp ? 'card-appear-left' : ''}
            />
          ) : (
            <CardComponent placeholder />
          )}
        </div>

        <div className="vs-divider">VS</div>

        {/* P2 card slot */}
        <div ref={p2CardSlotRef} style={{ minWidth: 63, minHeight: 88 }}>
          {p2Card ? (
            <CardComponent
              card={p2Card}
              className={p2Card.faceUp ? 'card-appear-right' : ''}
            />
          ) : (
            <CardComponent placeholder />
          )}
        </div>
      </div>
    );
  };

  const renderWarCards = () => {
    const maxLen = Math.max(p1WarFaceDown.length, p2WarFaceDown.length);
    if (maxLen === 0) return null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
        <div className="war-label">WAR CARDS</div>
        <div style={{ display: 'flex', gap: 20 }}>
          {/* P1 war cards */}
          <div className="war-cards-row">
            {p1WarFaceDown.map((c, i) => (
              <CardComponent key={i} card={c} style={{ marginLeft: i > 0 ? -30 : 0, transform: `rotate(${(i - 1) * 5}deg)` }} />
            ))}
            {p1WarDecider && (
              <CardComponent card={p1WarDecider} className="card-appear-left" style={{ marginLeft: 8 }} />
            )}
          </div>
          <div className="war-label">vs</div>
          {/* P2 war cards */}
          <div className="war-cards-row">
            {p2WarFaceDown.map((c, i) => (
              <CardComponent key={i} card={c} style={{ marginLeft: i > 0 ? -30 : 0, transform: `rotate(${(i - 1) * 5}deg)` }} />
            ))}
            {p2WarDecider && (
              <CardComponent card={p2WarDecider} className="card-appear-right" style={{ marginLeft: 8 }} />
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderControls = () => {
    switch (phase) {
      case 'setup':
        return (
          <div className="controls-row">
            <button className="btn btn-primary" onClick={onStartGame} style={{ padding: '10px 28px', fontSize: 15 }}>
              🃏 Start Game
            </button>
          </div>
        );

      case 'choosing':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <div className="player-choice-row">
              <div className="choice-indicator">
                <span className={`choice-dot ${p1Chosen ? 'ready' : 'accent-a'}`} />
                {p1Chosen ? '✓ Ready' : p1Name}
              </div>
              <div className="choice-indicator">
                <span className={`choice-dot ${p2Chosen ? 'ready' : 'accent-b'}`} />
                {p2Chosen ? '✓ Ready' : p2Name}
              </div>
            </div>
            <div className="controls-row">
              <button className="btn btn-primary" onClick={onPlayRandom} disabled={!p1HasCards || !p2HasCards}>
                🎲 Both Random
              </button>
              <button className="btn btn-secondary" onClick={onP1Choose} disabled={p1Chosen || !p1HasCards}>
                {p1Name}: Choose
              </button>
              <button className="btn btn-secondary" onClick={onP2Choose} disabled={p2Chosen || !p2HasCards}>
                {p2Name}: Choose
              </button>
            </div>
          </div>
        );

      case 'animating':
        return (
          <div className="controls-row">
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Playing cards…</div>
          </div>
        );

      case 'revealed':
        return resultMessage ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <div className="round-result-banner">{resultMessage}</div>
            <div className="controls-row">
              <button className="btn btn-primary" onClick={onNextRound}>Next Round →</button>
            </div>
          </div>
        ) : null;

      case 'war_setup':
      case 'war_facedown':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <div style={{ color: '#F59E0B', fontWeight: 700, fontSize: 13 }}>Each player places 3 face-down cards</div>
            <div className="controls-row">
              <button className="btn btn-war" onClick={onWarFaceDownRandom} disabled={warFaceDownChosen}>
                🎲 Random Face-Down
              </button>
            </div>
          </div>
        );

      case 'war_animating':
        return (
          <div className="controls-row">
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>War cards flying…</div>
          </div>
        );

      case 'war_deciding':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <div style={{ color: '#F59E0B', fontWeight: 700, fontSize: 13 }}>Now play the deciding card!</div>
            <div className="player-choice-row">
              <div className="choice-indicator">
                <span className={`choice-dot ${warP1DeciderChosen ? 'ready' : 'accent-a'}`} />
                {warP1DeciderChosen ? '✓ Ready' : p1Name}
              </div>
              <div className="choice-indicator">
                <span className={`choice-dot ${warP2DeciderChosen ? 'ready' : 'accent-b'}`} />
                {warP2DeciderChosen ? '✓ Ready' : p2Name}
              </div>
            </div>
            <div className="controls-row">
              <button className="btn btn-war" onClick={onWarDecidingRandom}>
                🎲 Both Random
              </button>
              <button className="btn btn-secondary" onClick={onWarP1Choose} disabled={warP1DeciderChosen || !p1HasCards}>
                {p1Name}: Choose
              </button>
              <button className="btn btn-secondary" onClick={onWarP2Choose} disabled={warP2DeciderChosen || !p2HasCards}>
                {p2Name}: Choose
              </button>
            </div>
          </div>
        );

      case 'war_revealed':
        return resultMessage ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <div className="round-result-banner">{resultMessage}</div>
            <div className="controls-row">
              <button className="btn btn-primary" onClick={onNextRound}>Next Round →</button>
            </div>
          </div>
        ) : null;

      case 'capturing':
        return (
          <div className="controls-row">
            <div style={{ color: '#C9A84C', fontWeight: 700, fontSize: 13 }}>Capturing…</div>
          </div>
        );

      case 'round_end':
        return (
          <div className="controls-row">
            <button className="btn btn-primary" onClick={onNextRound}>Next Round →</button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="center-area">
      {/* Status bar showing round */}
      {phase !== 'setup' && (
        <div className="status-bar">
          <span className="round-number">Round {roundNumber}</span>
          {phase === 'choosing' ? 'Play a card' :
           phase.startsWith('war') ? '⚔ WAR ⚔' :
           phase === 'game_over' ? '🏆 Game Over' :
           ''}
        </div>
      )}

      {/* Pot badge */}
      {potSize > 0 && (
        <div className="pot-badge">🃏 Pot: {potSize} cards</div>
      )}

      {/* Battle cards */}
      {(phase !== 'setup') && renderBattleCards()}

      {/* War cards */}
      {(p1WarFaceDown.length > 0 || p2WarFaceDown.length > 0) && renderWarCards()}

      {/* Result message (inline for non-war) */}
      {renderControls()}
    </div>
  );
}
