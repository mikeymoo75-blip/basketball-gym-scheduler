import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { BrandMark } from "@/components/brand-mark";
import { ChangePasswordForm } from "@/components/change-password-form";

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.mustChangePassword) redirect("/schedule");

  return (
    <div className="hardwood-wash flex min-h-svh items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-6 shadow-sm md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <BrandMark className="size-8 text-primary" />
          <div>
            <p className="font-heading text-xl font-semibold tracking-[0.06em]">MP Basketball</p>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Midland Park
            </p>
          </div>
        </div>
        <h1 className="font-heading text-3xl font-semibold">Choose a new password</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {user.name}, an admin set a temporary password for this account. Enter it once,
          then pick a password only you know. You cannot open the schedule until this is
          done.
        </p>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
