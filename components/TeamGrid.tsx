import Image from "next/image";
import type { Person } from "@/lib/content";

const firstName = (name: string) => name.trim().split(/\s+/)[0];

// Shared inboxes (e.g. the office) carry a note like "FAO Joey"; put it in the subject.
const mailtoHref = (email: string, note?: string) =>
  `mailto:${email}${note ? `?subject=${encodeURIComponent(note)}` : ""}`;

export default function TeamGrid({ people, compact = false }: { people: Person[]; compact?: boolean }) {
  return (
    <ul className={`team-grid${compact ? " team-grid-compact" : ""}`}>
      {people.map((person) => (
        <li className="team-member" key={`${person.name}-${person.photo}`}>
          <Image
            src={`/images/team/${person.photo}`}
            alt=""
            width={400}
            height={400}
            sizes={compact ? "(max-width: 600px) 50vw, 200px" : "(max-width: 600px) 100vw, 280px"}
          />
          <div className="team-member-body">
            <h3>{person.name}</h3>
            {person.role && <p className="team-role">{person.role}</p>}
            {person.bio && <p>{person.bio}</p>}
            {person.email && (
              <p className="team-email">
                <a
                  className="button"
                  href={mailtoHref(person.email, person.email_note)}
                  title={person.email_note ? `${person.email} (${person.email_note})` : person.email}
                >
                  Email {firstName(person.name)}
                </a>
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
