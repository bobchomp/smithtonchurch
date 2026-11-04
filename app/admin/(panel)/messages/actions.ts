"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { ADMIN_HOST } from "@/lib/domains";
import { sendMessageNotification } from "@/lib/email";
import { deleteMessages, getMessage, getRecipients, isEmailAddress, setRecipients, updateMessage } from "@/lib/messages";

function refresh() {
  revalidatePath("/admin/messages");
  revalidatePath("/admin");
}

export async function deleteSelectedMessages(ids: string[]): Promise<{ error?: string }> {
  await requireAdmin();
  try {
    await deleteMessages(ids);
    refresh();
    return {};
  } catch (error) {
    return { error: `Couldn’t delete. ${(error as Error).message}` };
  }
}

export async function deleteOneMessage(formData: FormData): Promise<void> {
  await requireAdmin();
  await deleteMessages([String(formData.get("id"))]);
  refresh();
  redirect("/admin/messages/");
}

export async function setMessageRead(formData: FormData): Promise<void> {
  await requireAdmin();
  const message = await getMessage(String(formData.get("id")));
  if (!message) return;
  const read = formData.get("read") === "true";
  await updateMessage({ ...message, read });
  refresh();
  if (!read) redirect("/admin/messages/");
}

export async function addRecipient(_state: { error?: string; ok?: boolean }, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!isEmailAddress(email)) return { error: "Please enter a valid email address." };
  const recipients = await getRecipients();
  if (recipients.includes(email)) return { error: "That address is already on the list." };
  if (recipients.length >= 10) return { error: "There’s a limit of 10 addresses." };
  await setRecipients([...recipients, email]);
  refresh();
  return { ok: true };
}

export async function removeRecipient(formData: FormData): Promise<void> {
  await requireAdmin();
  const email = String(formData.get("email") ?? "");
  await setRecipients((await getRecipients()).filter((r) => r !== email));
  refresh();
}

// Sends a sample notification to everyone on the list, to check the email set-up.
export async function sendTestEmail(): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const recipients = await getRecipients();
  if (!recipients.length) return { ok: false, message: "Add at least one email address first." };
  try {
    await sendMessageNotification(
      {
        id: "test",
        receivedAt: new Date().toISOString(),
        name: "Test from the admin panel",
        email: recipients[0],
        subject: "Test email",
        message: "This is a test of the website’s contact form emails. If you can read this, they’re working.",
        source: "Admin panel test",
        read: true,
      },
      recipients,
      `https://${ADMIN_HOST}/admin/messages/`,
    );
    return { ok: true, message: `Test email sent to ${recipients.join(", ")}.` };
  } catch (error) {
    return { ok: false, message: `The test email didn’t send. ${(error as Error).message}` };
  }
}
