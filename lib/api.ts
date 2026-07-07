"use client";

import type { PlaybookFile, TeamBundle } from "./types";

export async function rpc<T>(action: string, payload: unknown): Promise<T> {
  const res = await fetch("/api/rpc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  const json = await res.json().catch(() => ({ ok: false, error: "Network error" }));
  if (!json.ok) throw new Error(json.error ?? "Request failed");
  return json.data as T;
}

/* ---------------- localStorage helpers (coach identity) ------------- */

const NAME_KEY = "playbook:coachName";
const TEAMS_KEY = "playbook:recentTeams";

export interface RecentTeam {
  joinCode: string;
  name: string;
}

export function getCoachName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(NAME_KEY) ?? "";
}

export function setCoachName(name: string) {
  localStorage.setItem(NAME_KEY, name.trim().slice(0, 40));
}

export function getRecentTeams(): RecentTeam[] {
  if (typeof window === "undefined") return [];
  try {
    const list = JSON.parse(localStorage.getItem(TEAMS_KEY) ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function rememberTeam(t: RecentTeam) {
  const list = [t, ...getRecentTeams().filter((x) => x.joinCode !== t.joinCode)];
  localStorage.setItem(TEAMS_KEY, JSON.stringify(list.slice(0, 8)));
}

export function forgetTeam(joinCode: string) {
  localStorage.setItem(
    TEAMS_KEY,
    JSON.stringify(getRecentTeams().filter((x) => x.joinCode !== joinCode)),
  );
}

/* ---------------- playbook export ----------------------------------- */

export function downloadPlaybook(bundle: TeamBundle) {
  const file: PlaybookFile = {
    app: "playbookgenos",
    version: 1,
    teamName: bundle.team.name,
    exportedAt: new Date().toISOString(),
    formations: bundle.formations,
    plays: bundle.plays,
  };
  const blob = new Blob([JSON.stringify(file, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${bundle.team.name.replace(/[^\w-]+/g, "_")}_playbook.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
