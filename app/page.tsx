"use client";

import { AnimatedPlay } from "@/components/play-diagram";
import {
  forgetTeam,
  getCoachName,
  getRecentTeams,
  rememberTeam,
  rpc,
  setCoachName,
  type RecentTeam,
} from "@/lib/api";
import { getPositionColor, templatePlayers } from "@/lib/templates";
import type { Formation, Play, Team, TeamBundle } from "@/lib/types";
import { btnGhost, btnPrimary, card, input } from "@/lib/ui";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

/** A canned Smash-concept play rendered live on the landing page. */
function useDemoPlay() {
  return useMemo(() => {
    const players = templatePlayers("offense", 11, "11");
    const at = (label: string) => players.find((p) => p.label === label)!;
    const route = (
      label: string,
      path: [number, number][],
      assignment: string,
      endStyle: "arrow" | "block" = "arrow",
    ): [string, Play["routes"][string]] => [
      at(label).id,
      { path, endStyle, color: getPositionColor(label), assignment },
    ];
    const offense: Formation = {
      id: "demo-o",
      teamId: "demo",
      name: "11 Personnel",
      side: "offense",
      playerCount: 11,
      players,
      createdAt: "",
    };
    const defense: Formation = {
      id: "demo-d",
      teamId: "demo",
      name: "4-3",
      side: "defense",
      playerCount: 11,
      players: templatePlayers("defense", 11),
      createdAt: "",
    };
    const routes: Play["routes"] = Object.fromEntries([
      route("X", [[12, 19.5], [17.5, 14]], "Slant"),
      route("Z", [[46, 16], [50.5, 10.5]], "Corner"),
      route("H", [[16, 18.5], [21, 13]], "Slant"),
      route("TE", [[35.7, 13.5]], "Seam"),
      route("RB", [[21, 29], [14.5, 26], [13.5, 18]], "Wheel"),
      route("RT", [[33.5, 26.5]], "Pass pro", "block"),
    ]);
    return { offense, defense, routes };
  }, []);
}

export default function Home() {
  const demo = useDemoPlay();
  const router = useRouter();
  const [name, setName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [recent, setRecent] = useState<RecentTeam[]>([]);
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(getCoachName());
    setRecent(getRecentTeams());
  }, []);

  const go = (team: { joinCode: string; name: string }) => {
    setCoachName(name);
    rememberTeam({ joinCode: team.joinCode, name: team.name });
    router.push(`/t/${team.joinCode}`);
  };

  const createTeam = async () => {
    if (!teamName.trim()) return setError("Give your team a name");
    setBusy("create");
    setError("");
    try {
      const team = await rpc<Team>("createTeam", { name: teamName });
      go(team);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setBusy(null);
    }
  };

  const joinTeam = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return setError("Enter a join code");
    setBusy("join");
    setError("");
    try {
      const { team } = await rpc<TeamBundle>("getTeam", { joinCode: code });
      go(team);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setBusy(null);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
          🏈 Playbook<span className="text-amber-400">Gen</span>
          <span className="text-neutral-500">OS</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-neutral-400">
          Draw plays, build your playbook, share it with every coach in your
          program — varsity down to youth.
        </p>
        <p className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-neutral-500">
          <span>✏️ Draw routes</span>
          <span>🎬 Animate plays</span>
          <span>📲 Share read-only</span>
          <span>🖨 Print play cards</span>
        </p>
      </header>

      <div className={`${card} mb-8 overflow-hidden`}>
        <AnimatedPlay
          offense={demo.offense}
          defense={demo.defense}
          routes={demo.routes}
          className="rounded-b-none"
        />
        <p className="px-4 py-2.5 text-center text-xs text-neutral-500">
          Smash concept out of 11 personnel — hit{" "}
          <span className="font-semibold text-neutral-300">▶ Run play</span> to
          see it move. Your plays animate the same way.
        </p>
      </div>

      <div className={`${card} mx-auto mb-6 max-w-md p-4`}>
        <label className="mb-1 block text-sm text-neutral-400">Your name</label>
        <input
          className={`${input} w-full`}
          placeholder="Coach Taylor"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <p className="mt-1 text-xs text-neutral-500">
          Shown on plays and suggestions you add. No account needed.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className={`${card} p-5`}>
          <h2 className="mb-3 font-bold text-white">Start a new team</h2>
          <input
            className={`${input} mb-3 w-full`}
            placeholder="Team name (e.g. Eastside Eagles)"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createTeam()}
          />
          <button
            className={`${btnPrimary} w-full`}
            onClick={createTeam}
            disabled={busy !== null}
          >
            {busy === "create" ? "Creating…" : "Create playbook"}
          </button>
        </section>

        <section className={`${card} p-5`}>
          <h2 className="mb-3 font-bold text-white">Join your staff</h2>
          <input
            className={`${input} mb-3 w-full uppercase`}
            placeholder="Join code (e.g. EAGLES-4F2)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && joinTeam()}
          />
          <button
            className={`${btnPrimary} w-full`}
            onClick={joinTeam}
            disabled={busy !== null}
          >
            {busy === "join" ? "Joining…" : "Open playbook"}
          </button>
        </section>
      </div>

      {error && <p className="mt-4 text-center text-sm text-rose-400">{error}</p>}

      {recent.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-500">
            Your teams
          </h2>
          <ul className="space-y-2">
            {recent.map((t) => (
              <li key={t.joinCode} className={`${card} flex items-center gap-3 p-3`}>
                <button
                  className="flex-1 text-left font-semibold text-white hover:text-amber-400"
                  onClick={() => router.push(`/t/${t.joinCode}`)}
                >
                  {t.name}
                  <span className="ml-2 text-xs font-normal text-neutral-500">
                    {t.joinCode}
                  </span>
                </button>
                <button
                  className={btnGhost}
                  onClick={() => {
                    forgetTeam(t.joinCode);
                    setRecent(getRecentTeams());
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-12 text-center text-xs text-neutral-600">
        Got a share code from another program? Open{" "}
        <span className="font-mono text-neutral-500">/s/YOURCODE</span> or paste
        the link they sent you.
      </footer>
    </main>
  );
}
