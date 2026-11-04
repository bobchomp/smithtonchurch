"use server";

import { revalidatePath } from "next/cache";
import { ADMIN_HOST } from "@/lib/domains";
import { emailIsConfigured, sendMessageNotification } from "@/lib/email";
import { getRecipients, isEmailAddress, messagesAreConfigured, saveNewMessage, updateMessage } from "@/lib/messages";

export type ContactState = { ok?: boolean; error?: string; fields?: Record<string, string> };

const SOURCES: Record<string, string> = { home: "Home page", venue: "Conferencing venue" };

// The website's contact forms. The message is saved first, then emailed to the people chosen in
// the admin panel, so nothing is lost if the email fails.
export async function sendContactMessage(_state: ContactState, formData: FormData): Promise<ContactState> {
  const field = (name: string) => String(formData.get(name) ?? "").trim();
  const fields = {
    firstName: field("firstName"),
    lastName: field("lastName"),
    email: field("email"),
    subject: field("subject"),
    message: field("message"),
  };

  // Spam: a hidden field people never see, and forms filled in faster than a person could.
  const startedAt = Number(field("startedAt"));
  if (field("website") || !startedAt || Date.now() - startedAt < 3000) return { ok: true };

  if (!fields.firstName || fields.firstName.length > 50) return { error: "Please enter your first name.", fields };
  if (!fields.lastName || fields.lastName.length > 50) return { error: "Please enter your last name.", fields };
  if (!isEmailAddress(fields.email)) return { error: "Please enter a valid email address.", fields };
  if (fields.subject.length > 200) return { error: "Please shorten the subject.", fields };
  if (!fields.message) return { error: "Please write a message.", fields };
  if (fields.message.length > 5000) return { error: "Please shorten your message (5,000 characters at most).", fields };
  if (!messagesAreConfigured()) return { error: "Sorry, messages can’t be sent just now. Please call or email the office.", fields };

  let saved;
  try {
    const { firstName, lastName, ...rest } = fields;
    saved = await saveNewMessage({ ...rest, name: `${firstName} ${lastName}`, source: SOURCES[field("source")] ?? "Website" });
  } catch (error) {
    console.error("Could not save contact message", error);
    return { error: "Sorry, your message couldn’t be sent. Please try again, or call or email the office.", fields };
  }

  try {
    const recipients = await getRecipients();
    if (emailIsConfigured() && recipients.length) {
      await sendMessageNotification(saved, recipients, `https://${ADMIN_HOST}/admin/messages/${saved.id}/`);
      await updateMessage({ ...saved, emailed: true });
    } else {
      await updateMessage({ ...saved, emailed: false, emailError: !recipients.length ? "No one is set to receive messages." : "Email isn’t set up (RESEND_API_KEY)." });
    }
  } catch (error) {
    console.error("Could not email contact message", error);
    await updateMessage({ ...saved, emailed: false, emailError: (error as Error).message }).catch(() => undefined);
  }
  revalidatePath("/admin/messages");
  revalidatePath("/admin");
  return { ok: true };
}
