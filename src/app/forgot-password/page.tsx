import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
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
        <h1 className="font-heading text-3xl font-semibold">Forgot password</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Enter the email on your account. If we have it, you will get a reset link that
          expires in one hour.
        </p>
        <ForgotPasswordForm />
        <p className="mt-6 text-sm text-muted-foreground">
          <Link href="/login" className="underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
