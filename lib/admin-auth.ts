import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// The admin panel is protected by a single PIN, set as the ADMIN_PIN environment variable in
// Vercel. Signing in stores a signed cookie; changing the PIN signs everyone out.

const COOKIE_NAME = "smithton_admin";
const SESSION_HOURS = 12;

function sign(value: string, pin: string): string {
  return createHmac("sha256", pin).update(`smithton-admin:${value}`).digest("hex");
}

function sameText(a: string, b: string): boolean {
  // Compare hashes so the comparison takes the same time whatever the input.
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export function adminPinIsSet(): boolean {
  return Boolean(process.env.ADMIN_PIN);
}

export function pinMatches(attempt: string): boolean {
  const pin = process.env.ADMIN_PIN;
  return Boolean(pin) && sameText(attempt, pin!);
}

export async function startSession(): Promise<void> {
  const pin = process.env.ADMIN_PIN!;
  const expires = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const store = await cookies();
  store.set(COOKIE_NAME, `${expires}.${sign(String(expires), pin)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

export async function isSignedIn(): Promise<boolean> {
  const pin = process.env.ADMIN_PIN;
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!pin || !token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  return sameText(signature, sign(expires, pin));
}

// Call at the top of every admin page and server action that needs a signed-in user.
export async function requireAdmin(): Promise<void> {
  if (!(await isSignedIn())) redirect("/admin/login/");
}
