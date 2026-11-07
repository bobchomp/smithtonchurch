"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireOwner, requireTool } from "@/lib/admin-auth";
import { loadGoals, saveAnalyticsSettings, saveGoals } from "@/lib/analytics";
import {
  describeCondition,
  GOAL_TYPES,
  isGoalType,
  SUGGESTED_FUNNELS,
  SUGGESTED_GOALS,
  type FunnelStep,
  type GoalCondition,
} from "@/lib/analytics-goals";

// Owners switch tracking on or off.
export async function setTracking(formData: FormData): Promise<void> {
  await requireOwner();
  await saveAnalyticsSettings({ enabled: formData.get("enabled") === "on" });
  revalidatePath("/admin/analytics");
}

// ---------- Goals and funnels (anyone with the Analytics tool) ----------

const MAX_GOALS = 30;
const MAX_FUNNELS = 15;
const MAX_STEPS = 6;

export type GoalFormState = { error?: string; done?: string };

function condition(formData: FormData, prefix = ""): GoalCondition | string {
  const type = formData.get(`${prefix}type`);
  if (!isGoalType(type)) return "Please choose what counts.";
  const match = String(formData.get(`${prefix}match`) ?? "").trim().slice(0, 200);
  const spec = GOAL_TYPES.find((t) => t.key === type)!;
  if (spec.needsMatch && !match) return `Please fill in “${"match" in spec ? spec.match : "the details"}”.`;
  if ((type === "page" || type === "page-starts") && !match.startsWith("/")) return "Page addresses start with /, e.g. /live/.";
  return match ? { type, match: type === "page" && !match.endsWith("/") && !match.includes(".") ? `${match}/` : match } : { type };
}

const newId = () => randomUUID().slice(0, 8);

export async function addGoal(_state: GoalFormState, formData: FormData): Promise<GoalFormState> {
  await requireTool("analytics");
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!name) return { error: "Please give the goal a name." };
  const c = condition(formData);
  if (typeof c === "string") return { error: c };
  const config = await loadGoals();
  if (config.goals.length >= MAX_GOALS) return { error: `There can be up to ${MAX_GOALS} goals.` };
  config.goals.push({ id: newId(), name, condition: c });
  await saveGoals(config);
  revalidatePath("/admin/analytics");
  return { done: `Added “${name}”.` };
}

export async function addFunnel(_state: GoalFormState, formData: FormData): Promise<GoalFormState> {
  await requireTool("analytics");
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!name) return { error: "Please give the funnel a name." };
  const count = Math.min(MAX_STEPS, Number(formData.get("steps")) || 0);
  const steps: FunnelStep[] = [];
  for (let i = 0; i < count; i++) {
    const c = condition(formData, `s${i}-`);
    if (typeof c === "string") return { error: `Step ${i + 1}: ${c}` };
    steps.push({ name: String(formData.get(`s${i}-name`) ?? "").trim().slice(0, 60) || describeCondition(c), condition: c });
  }
  if (steps.length < 2) return { error: "A funnel needs at least two steps." };
  const config = await loadGoals();
  if (config.funnels.length >= MAX_FUNNELS) return { error: `There can be up to ${MAX_FUNNELS} funnels.` };
  config.funnels.push({ id: newId(), name, steps });
  await saveGoals(config);
  revalidatePath("/admin/analytics");
  return { done: `Added “${name}”.` };
}

// Adds one of the suggested goals or funnels.
export async function addSuggestion(formData: FormData): Promise<void> {
  await requireTool("analytics");
  const config = await loadGoals();
  const i = Number(formData.get("index"));
  if (formData.get("kind") === "funnel") {
    const f = SUGGESTED_FUNNELS[i];
    if (f && config.funnels.length < MAX_FUNNELS) config.funnels.push({ id: newId(), ...f });
  } else {
    const g = SUGGESTED_GOALS[i];
    if (g && config.goals.length < MAX_GOALS && !config.goals.some((x) => x.name === g.name)) config.goals.push({ id: newId(), ...g });
  }
  await saveGoals(config);
  revalidatePath("/admin/analytics");
}

export async function removeGoalOrFunnel(formData: FormData): Promise<void> {
  await requireTool("analytics");
  const id = String(formData.get("id") ?? "");
  const config = await loadGoals();
  await saveGoals({ goals: config.goals.filter((g) => g.id !== id), funnels: config.funnels.filter((f) => f.id !== id) });
  revalidatePath("/admin/analytics");
}
