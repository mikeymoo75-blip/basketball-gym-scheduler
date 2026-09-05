export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect
        x="4"
        y="3"
        width="24"
        height="26"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M4 21h24" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 21v8" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16" cy="21" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 3v5h8V3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
