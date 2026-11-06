"use client";

import { useActionState, useState } from "react";
import { requestPasswordReset, signIn, signInWithPin, type FormState } from "../actions";

function Message({ state }: { state: FormState }) {
  if (state.error) return <p className="admin-error" role="alert">{state.error}</p>;
  if (state.done) return <p className="admin-success" role="status">{state.done}</p>;
  return null;
}

// Email and password, with "Forgot your password?" and the backup PIN as alternatives.
export default function LoginForm() {
  const [mode, setMode] = useState<"password" | "forgot" | "pin">("password");
  const [loginState, login, loggingIn] = useActionState<FormState, FormData>(signIn, {});
  const [resetState, reset, resetting] = useActionState<FormState, FormData>(requestPasswordReset, {});
  const [pinState, pinLogin, checkingPin] = useActionState<FormState, FormData>(signInWithPin, {});

  if (mode === "forgot") {
    return (
      <form className="admin-login-form" action={reset}>
        <p className="admin-login-help">Enter your email address and we’ll send you a link to choose a new password.</p>
        <label>
          Email
          <input type="email" name="email" autoComplete="email" required autoFocus />
        </label>
        <Message state={resetState} />
        <button className="button" type="submit" disabled={resetting}>{resetting ? "Sending…" : "Send the link"}</button>
        <button className="admin-login-switch" type="button" onClick={() => setMode("password")}>← Back to sign in</button>
      </form>
    );
  }

  if (mode === "pin") {
    return (
      <form className="admin-login-form" action={pinLogin}>
        <label>
          Backup PIN
          <input type="password" name="pin" inputMode="numeric" autoComplete="off" required autoFocus />
        </label>
        <Message state={pinState} />
        <button className="button" type="submit" disabled={checkingPin}>{checkingPin ? "Checking…" : "Sign in"}</button>
        <button className="admin-login-switch" type="button" onClick={() => setMode("password")}>← Sign in with email instead</button>
      </form>
    );
  }

  return (
    <form className="admin-login-form" action={login}>
      <label>
        Email
        <input type="email" name="email" autoComplete="username" required autoFocus />
      </label>
      <label>
        Password
        <input type="password" name="password" autoComplete="current-password" required />
      </label>
      <Message state={loginState} />
      <button className="button" type="submit" disabled={loggingIn}>{loggingIn ? "Signing in…" : "Sign in"}</button>
      <div className="admin-login-links">
        <button className="admin-login-switch" type="button" onClick={() => setMode("forgot")}>Forgot your password?</button>
        <button className="admin-login-switch" type="button" onClick={() => setMode("pin")}>Use the backup PIN</button>
      </div>
    </form>
  );
}
