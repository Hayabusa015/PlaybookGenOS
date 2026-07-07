"use client";

export type SaveState = "saved" | "saving" | "dirty" | "error";

export function SaveStatus({ state }: { state: SaveState }) {
  const text = {
    saved: "✓ Saved",
    saving: "Saving…",
    dirty: "Unsaved changes",
    error: "⚠ Save failed — retrying",
  }[state];
  const color = {
    saved: "text-emerald-400",
    saving: "text-slate-400",
    dirty: "text-slate-400",
    error: "text-rose-400",
  }[state];
  return <span className={`text-xs font-medium ${color}`}>{text}</span>;
}
