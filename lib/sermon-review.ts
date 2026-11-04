import { type Sermon } from "./sermon-types";

// "Fill in details" (Admin → Sermons) steps through the sermons the old media site
// (smithtonchurchmedia.com) can't give details for: those after its last sermon. Its sermons are
// imported with their old numbers (legacyId); until that has happened, its last sermon is known to
// be from 15 February 2026.
const MEDIA_SITE_LAST_SERMON = "2026-02-15";

export function mediaSiteCutoff(sermons: Sermon[]): string {
  return sermons.reduce((latest, s) => (s.legacyId && s.date > latest ? s.date : latest), MEDIA_SITE_LAST_SERMON);
}

// Sermons still to go through, oldest first. A sermon leaves the list once it's saved there.
export function sermonsToReview(sermons: Sermon[]): Sermon[] {
  const cutoff = mediaSiteCutoff(sermons);
  return sermons
    .filter((s) => s.date > cutoff && !s.legacyId && !s.detailsChecked)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.service === "pm" ? 1 : 0) - (b.service === "pm" ? 1 : 0) || a.id - b.id);
}
