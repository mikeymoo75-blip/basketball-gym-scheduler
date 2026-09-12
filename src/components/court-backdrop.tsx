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
    </div>
  );
}
