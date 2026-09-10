import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? "";

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
          Pick a password only you know. The reset link works once and expires in an hour.
        </p>
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="mt-8 text-sm text-destructive">
            That reset link is missing. Request a new one from the sign-in screen.
          </p>
        )}
        <p className="mt-6 text-sm text-muted-foreground">
          <Link href="/login" className="underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
