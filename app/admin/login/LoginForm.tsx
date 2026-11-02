"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "../actions";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(signIn, {});
  return (
    <form className="admin-login-form" action={formAction}>
      <label>
        Admin PIN
        <input
          type="password"
          name="pin"
          inputMode="numeric"
          autoComplete="current-password"
          required
          autoFocus
        />
      </label>
      {state.error && (
        <p className="admin-error" role="alert">
          {state.error}
        </p>
      )}
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
