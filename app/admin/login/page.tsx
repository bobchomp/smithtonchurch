import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/admin-auth";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function AdminLogin() {
  if (await isSignedIn()) redirect("/admin/");
  return (
    <main className="admin-login">
      <div className="admin-login-card">
        <LoginForm />
      </div>
    </main>
  );
}
