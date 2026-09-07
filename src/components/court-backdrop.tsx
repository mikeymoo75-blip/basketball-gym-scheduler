export function CourtBackdrop({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 700 1000"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <pattern id="court-planks" width="36" height="1000" patternUnits="userSpaceOnUse">
          <rect width="36" height="1000" fill="oklch(0.2 0.042 155)" />
          <rect width="18" height="1000" fill="oklch(0.225 0.046 152)" />
          <rect x="17" width="1" height="1000" fill="oklch(0.18 0.035 155)" />
        </pattern>
        <radialGradient id="court-glow" cx="50%" cy="50%" r="62%">
          <stop offset="0%" stopColor="oklch(0.34 0.06 150)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="oklch(0.16 0.03 155)" stopOpacity="0.2" />
        </radialGradient>
        <linearGradient id="court-vignette" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.14 0.03 155)" stopOpacity="0.55" />
          <stop offset="35%" stopColor="oklch(0.14 0.03 155)" stopOpacity="0.12" />
          <stop offset="70%" stopColor="oklch(0.14 0.03 155)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="oklch(0.12 0.03 155)" stopOpacity="0.62" />
        </linearGradient>
      </defs>

      <rect width="700" height="1000" fill="url(#court-planks)" />
      <rect width="700" height="1000" fill="url(#court-glow)" />

      <g transform="translate(100 30)">
        <rect width="500" height="940" fill="oklch(0.23 0.05 152)" fillOpacity="0.35" />

        <g fill="oklch(0.28 0.07 148)" fillOpacity="0.55">
          <rect x="190" y="0" width="120" height="190" />
          <rect x="190" y="750" width="120" height="190" />
        </g>

        <g
          fill="none"
          stroke="oklch(0.93 0.02 145)"
          strokeOpacity="0.42"
          strokeWidth="3.2"
          strokeLinejoin="round"
        >
          <rect x="0" y="0" width="500" height="940" />
          <path d="M0 470h500" />
          <circle cx="250" cy="470" r="60" />
          <circle cx="250" cy="470" r="8" fill="oklch(0.93 0.02 145)" fillOpacity="0.42" stroke="none" />

          <path d="M190 0v190h120V0" />
          <path d="M190 940v-190h120v190" />
          <path d="M190 190a60 60 0 0 0 120 0" />
          <path d="M190 750a60 60 0 0 1 120 0" />
          <path d="M190 190a60 60 0 0 1 120 0" strokeDasharray="10 10" />
          <path d="M190 750a60 60 0 0 0 120 0" strokeDasharray="10 10" />

          <path d="M40 0v118A220 220 0 0 1 460 118V0" />
          <path d="M40 940v-118A220 220 0 0 0 460 822v118" />

          <path d="M208 40h84" strokeWidth="5.5" />
          <path d="M208 900h84" strokeWidth="5.5" />
          <circle cx="250" cy="58" r="9" />
          <circle cx="250" cy="882" r="9" />
          <path d="M232 58a18 18 0 0 0 36 0" />
          <path d="M232 882a18 18 0 0 1 36 0" />

          <path d="M0 80h22M478 80h22M0 860h22M478 860h22" />
          <path d="M0 190h16M484 190h16M0 750h16M484 750h16" />
        </g>
      </g>

      <rect width="700" height="1000" fill="url(#court-vignette)" />
    </svg>
  );
}
