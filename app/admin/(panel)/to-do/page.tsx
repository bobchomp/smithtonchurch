import type { Metadata } from "next";
import { requireOwner } from "@/lib/admin-auth";
import { TO_DO } from "./items";

export const metadata: Metadata = { title: "To-do list" };

function doneDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export default async function ToDoList() {
  await requireOwner();
  const all = TO_DO.flatMap((g) => g.sections.flatMap((s) => s.items));
  const done = all.filter((i) => i.done).length;
  let number = 0;
  return (
    <>
      <h1>To-do list</h1>
      <p className="admin-intro">
        What’s left to do on the website. Finished items are crossed out but kept, so you can see what’s been done.{" "}
        {all.length > 0 && <strong>{done} of {all.length} done.</strong>}
      </p>
      {TO_DO.length === 0 && (
        <section className="admin-panel">
          <p className="admin-muted">Nothing on the list at the moment.</p>
        </section>
      )}
      <div className="todo-list">
        {TO_DO.map((group) => (
          <section key={group.heading} className="admin-panel">
            <h2>{group.heading}</h2>
            {group.sections.map((section, i) => (
              <div key={section.heading ?? i} className="todo-section">
                {section.heading && <h3>{section.heading}</h3>}
                <ul>
                  {section.items.map((item) => {
                    number += 1;
                    return (
                      <li key={item.title} className={item.done ? "is-done" : undefined}>
                        <span className="todo-number" aria-hidden="true">{number}</span>
                        <div>
                          {item.done ? (
                            <>
                              <p className="todo-title"><s>{item.title}</s></p>
                              {item.detail && <p className="todo-detail"><s>{item.detail}</s></p>}
                              <p className="todo-done">Done {doneDate(item.done)}</p>
                            </>
                          ) : (
                            <>
                              <p className="todo-title">{item.title}</p>
                              {item.detail && <p className="todo-detail">{item.detail}</p>}
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
