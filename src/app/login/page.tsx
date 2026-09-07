import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "@/components/login-form";
import { BrandMark } from "@/components/brand-mark";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user?.mustChangePassword) redirect("/change-password");
  if (user) redirect("/schedule");

  return (
    <div className="hardwood-wash relative grid min-h-svh lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-[oklch(0.21_0.04_155)] text-[oklch(0.97_0.01_150)] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgb(255 255 255 / 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.05) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
        <div className="relative flex items-center gap-3">
          <BrandMark className="size-9 text-[oklch(0.82_0.07_150)]" />
          <div>
            <p className="font-heading text-2xl font-semibold tracking-[0.06em]">MP Basketball</p>
            <p className="text-xs uppercase tracking-[0.22em] text-white/50">Midland Park</p>
          </div>
        </div>
        <div className="relative max-w-md space-y-5">
          <p className="font-heading text-5xl leading-[0.95] font-semibold">
            Reserve the hardwood.
            <span className="block text-[oklch(0.82_0.07_150)]">Keep the board fair.</span>
          </p>
          <p className="text-base leading-relaxed text-white/70">
            Coaches book gyms by day and time. Games lock the floor. Admins see who is
            taking more than their share.
          </p>
        </div>
        <p className="relative text-sm text-white/40">
          Godwin · Highland · Midland Park · Eastern Christian · The Barn
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandMark className="size-8 text-primary" />
            <div>
              <p className="font-heading text-xl font-semibold tracking-[0.06em]">MP Basketball</p>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Midland Park
              </p>
            </div>
          </div>
          <h1 className="font-heading text-3xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use your admin username or coach email to open the Midland Park practice board.
          </p>
          <LoginForm />
          {process.env.NODE_ENV !== "production" ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Copying this onto a Proxmox VM?{" "}
              <a href="/copy-to-vm" className="font-medium text-primary underline">
                Download the app zip
              </a>
            </p>
          ) : null}
        </div>
      </section>
      <p className="pointer-events-none absolute right-6 bottom-5 text-[10px] tracking-[0.04em] text-muted-foreground/70 lg:right-8 lg:bottom-6">
        MTS Productions 2026
      </p>
    </div>
  );
}
