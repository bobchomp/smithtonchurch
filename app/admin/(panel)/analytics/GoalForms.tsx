"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { GOAL_TYPES, type GoalType } from "@/lib/analytics-goals";
import { addFunnel, addGoal, type GoalFormState } from "./actions";

// What counts for a goal or funnel step, and the detail box when that kind needs one.
function ConditionFields({ prefix = "", label = "What counts" }: { prefix?: string; label?: string }) {
  const [type, setType] = useState<GoalType>("page");
  const spec = GOAL_TYPES.find((t) => t.key === type)!;
  return (
    <>
      <label>
        {label}
        <select name={`${prefix}type`} value={type} onChange={(e) => setType(e.target.value as GoalType)}>
          {GOAL_TYPES.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
      </label>
      {"match" in spec && (
        <label>
          {spec.match}
          <input type="text" name={`${prefix}match`} maxLength={200} required={spec.needsMatch} autoComplete="off" />
        </label>
      )}
    </>
  );
}

function Feedback({ state }: { state: GoalFormState }) {
  return (
    <>
      {state.error && <p className="admin-error" role="alert">{state.error}</p>}
      {state.done && <p className="admin-success" role="status">{state.done}</p>}
    </>
  );
}

export function GoalForm() {
  const [state, action, pending] = useActionState<GoalFormState, FormData>(addGoal, {});
  const form = useRef<HTMLFormElement>(null);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (state.done) {
      form.current?.reset();
      setKey((k) => k + 1);
    }
  }, [state]);
  return (
    <form ref={form} className="admin-form analytics-goals-form" action={action}>
      <label>
        Name
        <input type="text" name="name" maxLength={80} required placeholder="e.g. Watched a live service" autoComplete="off" />
      </label>
      <div className="admin-pair" key={key}>
        <ConditionFields />
      </div>
      <Feedback state={state} />
      <button className="button" type="submit" disabled={pending}>{pending ? "Adding…" : "Add goal"}</button>
    </form>
  );
}

export function FunnelForm() {
  const [state, action, pending] = useActionState<GoalFormState, FormData>(addFunnel, {});
  const form = useRef<HTMLFormElement>(null);
  const [steps, setSteps] = useState(2);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (state.done) {
      form.current?.reset();
      setSteps(2);
      setKey((k) => k + 1);
    }
  }, [state]);
  return (
    <form ref={form} className="admin-form analytics-goals-form" action={action}>
      <label>
        Name
        <input type="text" name="name" maxLength={80} required placeholder="e.g. Home page to giving" autoComplete="off" />
      </label>
      <input type="hidden" name="steps" value={steps} />
      <div className="analytics-goals-form" key={key}>
        {Array.from({ length: steps }, (_, i) => (
          <fieldset key={i} className="analytics-step">
            <legend className="analytics-step-title">Step {i + 1}</legend>
            <label>
              Step name <span className="admin-optional">(optional)</span>
              <input type="text" name={`s${i}-name`} maxLength={60} autoComplete="off" />
            </label>
            <ConditionFields prefix={`s${i}-`} />
          </fieldset>
        ))}
      </div>
      <div className="admin-row-links">
        {steps < 6 && (
          <button type="button" className="admin-link-button admin-link-plain" onClick={() => setSteps((n) => n + 1)}>
            Add a step
          </button>
        )}
        {steps > 2 && (
          <button type="button" className="admin-link-button" onClick={() => setSteps((n) => n - 1)}>
            Remove the last step
          </button>
        )}
      </div>
      <Feedback state={state} />
      <button className="button" type="submit" disabled={pending}>{pending ? "Adding…" : "Add funnel"}</button>
    </form>
  );
}
