import type { Metadata } from "next";
import { requireOwner } from "@/lib/admin-auth";
import CopyButton from "../branding/CopyButton";
import { SKILL_PACKS } from "./skills";

export const metadata: Metadata = { title: "Claude Skills" };

export default async function ClaudeSkills() {
  await requireOwner();
  return (
    <>
      <h1>Claude Skills</h1>
      <p className="admin-intro">
        The useful commands from the Claude Code skills tried on this website. Type a command in a Claude Code session
        (click one to copy it), or just ask in plain words and Claude picks the right skill. Cloud sessions start fresh,
        so a new session may need the install commands first.
      </p>
      <div className="skills-list">
        {SKILL_PACKS.map((pack) => (
          <section key={pack.name} className="admin-panel skills-pack">
            <h2>{pack.name}</h2>
            <p className="skills-about">{pack.about}</p>
            <details className="skills-install">
              <summary>Install</summary>
              <p className="admin-muted">From {pack.from}. Run these in Claude Code:</p>
              <ul>
                {pack.install.map((c) => (
                  <li key={c}><CopyButton text={c} /></li>
                ))}
              </ul>
            </details>
            {pack.groups.map((group, i) => (
              <div key={group.heading ?? i} className="skills-group">
                {group.heading && <h3>{group.heading}</h3>}
                <table className="skills-table">
                  <thead>
                    <tr>
                      <th scope="col">Command</th>
                      <th scope="col">Use it to</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.commands.map((c) => (
                      <tr key={c.command}>
                        <td><CopyButton text={c.command} /></td>
                        <td>{c.use}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            {pack.skip && <p className="admin-muted skills-skip">{pack.skip}</p>}
          </section>
        ))}
      </div>
    </>
  );
}
