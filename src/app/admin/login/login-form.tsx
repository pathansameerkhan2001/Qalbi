"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signInAction } from "@/lib/admin/actions";
import { ActionMessage, FieldError, initialActionState, SubmitButton } from "@/components/admin/form-bits";

export function LoginForm() {
  const [state, action] = useActionState(signInAction, initialActionState);
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const emailError = state.fieldErrors?.email;
  const passwordError = state.fieldErrors?.password;

  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      <div>
        <label htmlFor="admin-email" className="label">
          Email
        </label>
        <input
          id="admin-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? "admin-email-error" : undefined}
          className="field"
        />
        <FieldError state={state} name="email" id="admin-email-error" />
      </div>
      <div>
        <label htmlFor="admin-password" className="label">
          Password
        </label>
        <div className="relative">
          <input
            id="admin-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            aria-invalid={passwordError ? true : undefined}
            aria-describedby={passwordError ? "admin-password-error" : undefined}
            className="field pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-muted transition hover:text-forest"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        </div>
        <FieldError state={state} name="password" id="admin-password-error" />
      </div>
      <ActionMessage state={state} />
      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
