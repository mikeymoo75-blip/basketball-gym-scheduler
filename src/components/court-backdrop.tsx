export function CourtBackdrop({
  className,
  overlayClassName = "absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/50",
}: {
  className?: string;
  overlayClassName?: string;
}) {
  return (
    <div className={className} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/login-court.jpg"
        alt=""
        className="absolute inset-0 size-full object-cover object-center"
      />
      <div className={overlayClassName} />
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 200 120"
          className="w-[72%] max-w-[260px] translate-y-[6%] drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]"
        >
          <text
            x="100"
            y="96"
            textAnchor="middle"
            fill="#f4edd8"
            fillOpacity="0.82"
            stroke="#1a3d28"
            strokeOpacity="0.35"
            strokeWidth="3"
            paintOrder="stroke"
            fontFamily="var(--font-heading), ui-sans-serif, system-ui, sans-serif"
            fontWeight="800"
            fontSize="92"
            letterSpacing="-6"
          >
            MP
          </text>
        </svg>
      </div>
    </div>
  );
}
