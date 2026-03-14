interface Props {
  highlightedZones: string[];
}

export default function SvgMap({ highlightedZones }: Props) {
  const hasHighlights = highlightedZones.length > 0;

  return (
    <div className="relative w-full flex items-center justify-center">
      <style>{`
        @keyframes svg-pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 0.3; }
        }
        .svg-pulse-zone {
          animation: svg-pulse 1.5s ease-in-out infinite;
        }
      `}</style>
      <svg
        viewBox="0 0 200 400"
        width="120"
        height="240"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-lg"
      >
        {/* Simplified Israel outline */}
        <path
          d="M100,10 L130,30 L140,60 L145,90 L140,120 L145,150 L140,180 L130,210 L120,240 L110,270 L105,300 L100,330 L95,360 L90,380 L85,360 L80,330 L75,300 L70,270 L65,240 L60,210 L55,180 L50,150 L55,120 L60,90 L65,60 L75,30 Z"
          fill="#1e293b"
          stroke="#4ade80"
          strokeWidth="2"
        />

        {/* Alert highlight overlay */}
        {hasHighlights && (
          <path
            d="M100,10 L130,30 L140,60 L145,90 L140,120 L145,150 L140,180 L130,210 L120,240 L110,270 L105,300 L100,330 L95,360 L90,380 L85,360 L80,330 L75,300 L70,270 L65,240 L60,210 L55,180 L50,150 L55,120 L60,90 L65,60 L75,30 Z"
            fill="#ef4444"
            className="svg-pulse-zone"
          />
        )}

        {/* North region */}
        <circle cx="100" cy="60" r="4" fill={hasHighlights ? '#ef4444' : '#4ade80'} opacity="0.6" />
        {/* Central region */}
        <circle cx="90" cy="150" r="4" fill={hasHighlights ? '#ef4444' : '#4ade80'} opacity="0.6" />
        {/* South region */}
        <circle cx="95" cy="300" r="4" fill={hasHighlights ? '#ef4444' : '#4ade80'} opacity="0.6" />
      </svg>
    </div>
  );
}
