"use client";

import Image from "next/image";
import { useActionState, useRef, useState } from "react";
import {
  requestPasswordReset,
  signIn,
  signInWithPin,
  type FormState,
} from "../actions";

function Message({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p className="admin-error" role="alert">
        {state.error}
      </p>
    );
  if (state.done)
    return (
      <p className="admin-success" role="status">
        {state.done}
      </p>
    );
  return null;
}

// Email and password, with "Forgot your password?". The backup PIN is hidden: tapping the logo ten
// times (within a few seconds of each other) switches to it.
export default function LoginForm() {
  const [mode, setMode] = useState<"password" | "forgot" | "pin">("password");
  const taps = useRef({ count: 0, last: 0 });
  const logo = (
    <>
      <Image
        src="/images/logo.png"
        alt="Smithton Church"
        width={600}
        height={123}
        priority
        draggable={false}
        className="admin-login-logo"
        onClick={() => {
          const now = Date.now();
          taps.current.count =
            now - taps.current.last < 1500 ? taps.current.count + 1 : 1;
          taps.current.last = now;
          if (taps.current.count >= 10) {
            taps.current.count = 0;
            setMode("pin");
          }
        }}
      />
      <h1>Admin</h1>
    </>
  );
  const [loginState, login, loggingIn] = useActionState<FormState, FormData>(
    signIn,
    {},
  );
  const [resetState, reset, resetting] = useActionState<FormState, FormData>(
    requestPasswordReset,
    {},
  );
  const [pinState, pinLogin, checkingPin] = useActionState<FormState, FormData>(
    signInWithPin,
    {},
  );

  if (mode === "forgot") {
    return (
      <>
        {logo}
        <form className="admin-login-form" action={reset}>
          <p className="admin-login-help">
            Enter your email address and we’ll send you a link to choose a new
            password.
          </p>
          <label>
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              autoFocus
            />
          </label>
          <Message state={resetState} />
          <button className="button" type="submit" disabled={resetting}>
            {resetting ? "Sending…" : "Send the link"}
          </button>
          <button
            className="admin-login-switch"
            type="button"
            onClick={() => setMode("password")}
          >
            ← Back to sign in
          </button>
        </form>
      </>
    );
  }

  if (mode === "pin") {
    return (
      <>
        {logo}
        <form className="admin-login-form" action={pinLogin}>
          <label>
            Backup PIN
            <input
              type="password"
              name="pin"
              inputMode="numeric"
              autoComplete="off"
              required
              autoFocus
            />
          </label>
          <Message state={pinState} />
          <button className="button" type="submit" disabled={checkingPin}>
            {checkingPin ? "Checking…" : "Sign in"}
          </button>
          <button
            className="admin-login-switch"
            type="button"
            onClick={() => setMode("password")}
          >
            ← Sign in with email instead
          </button>
        </form>
      </>
    );
  }

  return (
    <>
      {logo}
      <form className="admin-login-form" action={login}>
        <label>
          Email
          <input
            type="email"
            name="email"
            autoComplete="username"
            required
            autoFocus
          />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </label>
        <Message state={loginState} />
        <button className="button" type="submit" disabled={loggingIn}>
          {loggingIn ? "Signing in…" : "Sign in"}
        </button>
        <div className="admin-login-links">
          <button
            className="admin-login-switch"
            type="button"
            onClick={() => setMode("forgot")}
          >
            Forgot your password?
          </button>
        </div>
      </form>
    </>
  );
}
