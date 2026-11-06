import { ADMIN_TOOLS, type AdminTool } from "@/lib/admin-tools";

// Tick boxes for the tools an admin can use (in the invite form and each admin's "Choose tools").
export default function ToolChecklist({ selected }: { selected: readonly AdminTool[] }) {
  return (
    <fieldset className="admin-tool-checklist">
      <legend>Tools they can use</legend>
      {ADMIN_TOOLS.map((tool) => (
        <label key={tool.key} className="admin-checkbox">
          <input type="checkbox" name="tools" value={tool.key} defaultChecked={selected.includes(tool.key)} />
          <span>
            {tool.label}
            <span className="admin-tool-hint">{tool.hint}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
