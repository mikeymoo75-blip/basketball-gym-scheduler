import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="hardwood-wash flex min-h-svh flex-col items-center justify-center px-6 text-center">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Out of bounds</p>
      <h1 className="mt-2 font-heading text-4xl font-semibold">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        That route is not on the board.
      </p>
      <Button className="mt-6" render={<Link href="/schedule" />}>
        Back to the schedule
      </Button>
    </div>
  );
}
