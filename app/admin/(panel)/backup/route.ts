import { logActivity } from "@/lib/activity";
import { requireOwner } from "@/lib/admin-auth";
import { db, selectAll, tableReady } from "@/lib/db";
import { loadNotices } from "@/lib/live-notices";
import { getRecipients, listMessages } from "@/lib/messages";
import { loadSermons } from "@/lib/sermons";

// "Download a backup" (owners only): everything the admin panel keeps, as one JSON file. Uploaded
// files (bulletins, images, audio) aren't included; they stay where they are.

export const dynamic = "force-dynamic";

export async function GET() {
  await requireOwner();
  try {
    const [sermons, liveNotices, messages, recipients, settings] = await Promise.all([
      loadSermons(),
      loadNotices(),
      listMessages(),
      getRecipients(),
      tableReady("site_settings").then((ok) =>
        ok ? selectAll<{ key: string; value: unknown }>((from, to) => db().from("site_settings").select("key, value").order("key").range(from, to)) : [],
      ),
    ]);
    const backup = {
      exportedAt: new Date().toISOString(),
      sermons,
      liveNotices,
      messages,
      contactRecipients: recipients,
      settings: Object.fromEntries(settings.map((s) => [s.key, s.value])),
    };
    await logActivity({ area: "Backup", action: "Downloaded a backup", details: { sermons: sermons.length, liveNotices: liveNotices.length, messages: messages.length } });
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
    return new Response(JSON.stringify(backup, null, 1), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="smithton-website-backup-${day}.json"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Backup failed", error);
    return new Response(`The backup couldn’t be made: ${(error as Error).message}`, { status: 500 });
  }
}
