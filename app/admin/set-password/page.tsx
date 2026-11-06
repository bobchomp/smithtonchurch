import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SetPasswordForm from "./SetPasswordForm";

export const metadata: Metadata = { title: "Choose a password" };

// Opened from an invitation or password-reset email. The link's token is only used when the form
// is sent (not when the page opens), so email scanners that open links don't use it up.
export default async function SetPassword({ searchParams }: { searchParams: Promise<{ token?: string; type?: string }> }) {
  const { token, type } = await searchParams;
  const invite = type === "invite";
  return (
    <main className="admin-login">
      <div className="admin-login-card">
        <Image src="/images/logo.png" alt="Smithton Church" width={600} height={123} priority />
        <h1>{invite ? "Welcome" : "Choose a new password"}</h1>
        {token ? (
          <SetPasswordForm token={token} type={invite ? "invite" : "recovery"} />
        ) : (
          <p>
            This link isn’t complete. Please use the link in your email again, or <Link href="/admin/login/">go to sign in</Link>.
          </p>
        )}
      </div>
    </main>
  );
}
