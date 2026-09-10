"use client";

import { useState } from "react";
import { requestPasswordResetAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
        If that email is on the roster, a reset letter is on the way. Check spam if you
        do not see it. Admins can also send a new password from People.
      </p>
    );
  }

  return (
    <form
      className="mt-8 space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setPending(true);
        setError(null);
        const result = await requestPasswordResetAction(String(form.get("email") ?? ""));
        setPending(false);
        if (result && "error" in result && result.error) {
          setError(result.error);
          return;
        }
        setDone(true);
      }}
    >
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-10"
        />
      </div>
      <Button type="submit" className="h-10 w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
