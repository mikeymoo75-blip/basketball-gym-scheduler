"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <form action={action} className="mt-8 space-y-4">
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="email">User name or email</Label>
        <Input
          id="email"
          name="email"
          type="text"
          autoComplete="username"
          required
          placeholder="User name or email"
          className="h-10"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          className="h-10"
        />
      </div>
      <Button type="submit" className="h-10 w-full" disabled={pending}>
        {pending ? "Checking the roster…" : "Enter the board"}
      </Button>
    </form>
  );
}
