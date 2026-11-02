import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/admin-auth";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function AdminLogin() {
  if (await isSignedIn()) redirect("/admin/");
  return (
    <main className="admin-login">
      <div className="admin-login-card">
        <Image src="/images/logo.png" alt="Smithton Church" width={600} height={123} priority />
        <h1>Admin</h1>
        <LoginForm />
      </div>
    </main>
  );
}
