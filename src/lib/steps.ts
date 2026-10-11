import type { ServerEvent, Step } from "./types";

/** Fold a server event into the list of steps shown in the live "running" view. */
export function applyEvent(steps: Step[], ev: ServerEvent): Step[] {
  switch (ev.type) {
    case "step_start":
      if (steps.some((s) => s.id === ev.id)) return steps;
      return [
        ...steps,
        { id: ev.id, title: ev.title, code: ev.code, logs: [], status: "running", model_id: ev.model_id, locked: ev.locked },
      ];
    case "step_code":
      return steps.map((s) => (s.id === ev.id ? { ...s, code: ev.code } : s));
    case "log":
      return steps.map((s) => (s.id === ev.step ? { ...s, logs: [...s.logs, ev.text] } : s));
    case "step_end":
      return steps.map((s) => (s.id === ev.id ? { ...s, status: ev.status, ms: ev.ms, error: ev.error } : s));
    default:
      return steps;
  }
}
