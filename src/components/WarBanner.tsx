interface WarBannerProps {
  visible: boolean;
}

export function WarBanner({ visible }: WarBannerProps) {
  if (!visible) return null;
  return (
    <div className="war-banner">
      <div className="war-banner-text">⚔ WAR! ⚔</div>
      <div className="war-sub">Place 3 face-down cards</div>
    </div>
  );
}
