import fs from "node:fs";
import path from "node:path";
import { load as parseYaml } from "js-yaml";

// Reads the editable YAML files in /content. Runs at build time only.
function load<T>(name: string): T {
  const file = path.join(process.cwd(), "content", `${name}.yml`);
  return parseYaml(fs.readFileSync(file, "utf8")) as T;
}

export type Site = {
  title: string;
  description: string;
  tagline: string;
  url: string;
  phone: string;
  phone_link: string;
  email: string;
  treasurer_email: string;
  address_lines: string[];
  office_hours: string;
  maps_link: string;
  maps_embed: string;
  livestream_embed: string;
  donate_link: string;
  churchsuite_link: string;
  social: { facebook: string; youtube: string; sermons: string; instagram: string; x: string };
};

// mobileOnly: shown in the phone/tablet menu but not the full desktop menu (which is out of room).
export type NavItem = { title: string; url: string; children?: NavItem[]; mobileOnly?: boolean };

export type Person = {
  name: string;
  role?: string;
  photo: string;
  bio?: string;
  email?: string;
  email_note?: string;
};

export type Team = { ministry: Person[]; support: Person[]; elders: Person[]; deacons: Person[] };

export type WhatsOnDay = {
  day: string;
  items: { name: string; image?: string; graphic?: "service-times"; details?: string }[];
};

export type MissionPartner = {
  name: string;
  subtitle?: string;
  image?: string;
  map?: string; // public/images/missions/maps/
  map_place?: string;
  description?: string;
  prayer?: string[];
  links?: { title: string; url: string }[];
  button?: { title: string; url: string };
};

export type VenueRoom = { name: string; image: string; details?: string; capacity?: string };

export type Bulletin = { date: string; file: string };

export const site = load<Site>("site");
export const navigation = load<NavItem[]>("navigation");
export const team = load<Team>("team");
export const whatsOn = load<WhatsOnDay[]>("whats-on");
export const missions = load<MissionPartner[]>("missions");
export const venueRooms = load<VenueRoom[]>("venue-rooms");
export const bulletin = load<Bulletin>("bulletin");

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isExternal(url: string): boolean {
  return /^https?:\/\//.test(url);
}
