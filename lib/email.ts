import "server-only";
import type { ContactMessage } from "./messages";

// Sends the "new message from the website" email through Resend (resend.com).
//
// Environment variables (set in Vercel):
//   RESEND_API_KEY  an API key from resend.com, for a domain verified there
//   CONTACT_FROM    optional; the address the emails come from. Defaults to the address below.
//
// The sender's name is shown as the person who filled in the form, e.g. "Mary Smith (Website)",
// but the email is still sent from the address below; replying goes to the person who wrote in.

const DEFAULT_FROM_ADDRESS = "info@rossmackenzie.co.uk";

function fromHeader(name: string): string {
  const configured = process.env.CONTACT_FROM?.trim();
  const address = configured?.match(/<([^>]+)>/)?.[1] ?? (configured || DEFAULT_FROM_ADDRESS);
  // Keep the display name to plain characters so it can't break the email header.
  const display = `${name.replace(/[\r\n"<>\\,;:@]/g, "").replace(/\s+/g, " ").trim().slice(0, 60) || "Someone"} (Website)`;
  return `"${display}" <${address}>`;
}

export function emailIsConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function sendMessageNotification(message: ContactMessage, to: string[], adminUrl: string): Promise<void> {
  if (!emailIsConfigured()) throw new Error("RESEND_API_KEY isn’t set");
  if (!to.length) throw new Error("no one is set to receive messages");
  const subject = `Website message: ${message.subject || `from ${message.name}`}`.slice(0, 200);
  const when = new Date(message.receivedAt).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/London" });
  const text = [
    `New message from the Smithton Church website (${message.source}).`,
    "",
    `From: ${message.name} <${message.email}>`,
    `Sent: ${when}`,
    message.subject ? `Subject: ${message.subject}` : "",
    "",
    message.message,
    "",
    `Reply to this email to reply to ${message.name}. All messages are kept in the admin panel: ${adminUrl}`,
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n");
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#2b3440">
<p style="color:#5d6875">New message from the Smithton Church website (${escapeHtml(message.source)}).</p>
<p><strong>From:</strong> ${escapeHtml(message.name)} &lt;<a href="mailto:${escapeHtml(message.email)}">${escapeHtml(message.email)}</a>&gt;<br>
<strong>Sent:</strong> ${escapeHtml(when)}${message.subject ? `<br><strong>Subject:</strong> ${escapeHtml(message.subject)}` : ""}</p>
<div style="white-space:pre-wrap;border-left:4px solid #456188;padding:8px 14px;background:#f5f7fa">${escapeHtml(message.message)}</div>
<p style="color:#5d6875;font-size:13px">Reply to this email to reply to ${escapeHtml(message.name)}. All messages are kept in the <a href="${escapeHtml(adminUrl)}">admin panel</a>.</p>
</div>`;

  const response = await fetch(process.env.RESEND_API_BASE?.replace(/\/+$/, "") || "https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: fromHeader(message.name),
      to,
      reply_to: `${message.name.replace(/[<>",]/g, "")} <${message.email}>`,
      subject,
      text,
      html,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(`Resend said: ${body.message ?? response.statusText}`);
  }
}
