// The website's to-do list (Admin → To-do list, owners only).
// When an item is finished, set "done" to the date (YYYY-MM-DD): the page strikes it through but keeps it.

export type ToDo = { title: string; detail?: string; done?: string };
export type ToDoGroup = { heading: string; note?: string; sections: { heading?: string; items: ToDo[] }[] };

// Emptied on 16 November 2026 at the owner's request, once most of the list was done. Add new agreed items here.
export const TO_DO: ToDoGroup[] = [];
