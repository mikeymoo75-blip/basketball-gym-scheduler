export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-4 w-28 animate-pulse rounded bg-muted" />
      <div className="h-10 w-64 animate-pulse rounded bg-muted" />
      <div className="h-80 animate-pulse rounded-2xl bg-card ring-1 ring-foreground/10" />
    </div>
  );
}
