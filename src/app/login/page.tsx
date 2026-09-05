import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "@/components/login-form";
import { BrandMark } from "@/components/brand-mark";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/schedule");

  return (
    <div className="hardwood-wash grid min-h-svh lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-[oklch(0.19_0.02_48)] text-[oklch(0.96_0.01_80)] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgb(255 255 255 / 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.05) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
        <div className="relative flex items-center gap-3">
          <BrandMark className="size-9 text-[oklch(0.78_0.13_52)]" />
          <div>
            <p className="font-heading text-2xl font-semibold tracking-[0.14em]">COURTLINE</p>
            <p className="text-xs uppercase tracking-[0.22em] text-white/50">Practice board</p>
          </div>
        </div>
        <div className="relative max-w-md space-y-5">
          <p className="font-heading text-5xl leading-[0.95] font-semibold">
            Reserve the hardwood.
            <span className="block text-[oklch(0.78_0.13_52)]">Keep the board fair.</span>
          </p>
          <p className="text-base leading-relaxed text-white/70">
            Coaches book gyms by day and time. Games lock the floor. Admins see who is
            taking more than their share.
          </p>
        </div>
        <p className="relative text-sm text-white/40">
          Godwin · Highland · Midland Park · Eastern Christian
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandMark className="size-8 text-primary" />
            <div>
              <p className="font-heading text-xl font-semibold tracking-[0.14em]">COURTLINE</p>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Practice board
              </p>
            </div>
          </div>
          <h1 className="font-heading text-3xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use your coach or admin email. Seed accounts are in the README.
          </p>
          <LoginForm />
        </div>
      </section>
    </div>
  );
}
