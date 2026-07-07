"use client";

import { PlayDiagram, usePlayAnimation } from "./play-diagram";
import { SaveStatus, type SaveState } from "./save-status";
import { getCoachName, rpc } from "@/lib/api";
import { ROUTE_COLORS } from "@/lib/templates";
import type { Formation, Play, PlayerRoute, TeamBundle } from "@/lib/types";
import { btnGhost, btnPrimary, card, input } from "@/lib/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Pt } from "@/lib/geometry";

const emptyRoute = (color: string): PlayerRoute => ({
  path: [],
  endStyle: "arrow",
  color,
  assignment: "",
});

export function PlayEditor({
  joinCode,
  playId,
}: {
  joinCode: string;
  playId: string;
}) {
  const router = useRouter();
  const isNew = playId === "new";

  const [bundle, setBundle] = useState<TeamBundle | null>(null);
  const [error, setError] = useState("");
  const [play, setPlay] = useState<Play | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // creation form
  const [newName, setNewName] = useState("");
  const [newFormationId, setNewFormationId] = useState("");
  const [newDefenseId, setNewDefenseId] = useState("");
  const [creating, setCreating] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const loaded = useRef(false);
  const anim = usePlayAnimation();

  useEffect(() => {
    rpc<TeamBundle>("getTeam", { joinCode })
      .then((b) => {
        setBundle(b);
        if (!isNew) {
          const p = b.plays.find((x) => x.id === playId);
          if (!p) setError("Play not found");
          else setPlay(p);
        } else {
          setNewFormationId(
            b.formations.find((f) => f.side === "offense")?.id ?? "",
          );
        }
      })
      .catch((e) => setError(e.message));
  }, [joinCode, playId, isNew]);

  // Debounced autosave.
  useEffect(() => {
    if (!play) return;
    if (!loaded.current) {
      loaded.current = true;
      return;
    }
    setSaveState("dirty");
    const t = setTimeout(() => {
      setSaveState("saving");
      rpc("savePlay", { joinCode, play })
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("error"));
    }, 700);
    return () => clearTimeout(t);
  }, [play, joinCode]);

  const offense =
    bundle && play
      ? (bundle.formations.find((f) => f.id === play.formationId) ?? null)
      : null;
  const defense =
    bundle && play?.defenseFormationId
      ? (bundle.formations.find((f) => f.id === play.defenseFormationId) ?? null)
      : null;

  const create = async () => {
    if (!newFormationId) return;
    setCreating(true);
    setError("");
    try {
      const p: Play = {
        id: crypto.randomUUID(),
        teamId: "",
        formationId: newFormationId,
        defenseFormationId: newDefenseId || null,
        name: newName.trim() || "New play",
        routes: {},
        notes: "",
        createdBy: getCoachName(),
        createdAt: new Date().toISOString(),
      };
      const { play: saved } = await rpc<{ play: Play }>("savePlay", {
        joinCode,
        play: p,
      });
      loaded.current = true;
      setPlay(saved);
      router.replace(`/t/${joinCode}/play/${saved.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
      setCreating(false);
    }
  };

  const updateRoute = (playerId: string, patch: Partial<PlayerRoute>) => {
    setPlay((pl) => {
      if (!pl) return pl;
      const existing =
        pl.routes[playerId] ??
        emptyRoute(
          ROUTE_COLORS[Object.keys(pl.routes).length % ROUTE_COLORS.length],
        );
      return {
        ...pl,
        routes: { ...pl.routes, [playerId]: { ...existing, ...patch } },
      };
    });
  };

  const selectPlayer = (id: string) => {
    anim.reset();
    setSelectedId(id);
    if (play && !play.routes[id]) updateRoute(id, {});
  };

  const onFieldTap = (p: Pt) => {
    if (!selectedId || !play || anim.playing) return;
    const route = play.routes[selectedId];
    updateRoute(selectedId, { path: [...(route?.path ?? []), p] });
  };

  const selectedRoute = selectedId && play ? play.routes[selectedId] : null;

  /* ---------------- creation form ---------------- */

  if (isNew && !play) {
    if (!bundle && !error)
      return <p className="mt-8 text-center text-slate-400">Loading…</p>;
    const offenses = bundle?.formations.filter((f) => f.side === "offense") ?? [];
    const defenses = bundle?.formations.filter((f) => f.side === "defense") ?? [];
    if (offenses.length === 0)
      return (
        <div className={`${card} mx-auto mt-8 max-w-md p-6 text-center`}>
          <p className="mb-4 text-slate-300">
            Plays are built on top of a formation — create an offensive
            formation first.
          </p>
          <Link href={`/t/${joinCode}/formation/new`} className={btnPrimary}>
            Create a formation
          </Link>
        </div>
      );
    return (
      <div className={`${card} mx-auto mt-8 max-w-md p-6`}>
        <h2 className="mb-4 text-lg font-bold text-white">New play</h2>
        <label className="mb-1 block text-sm text-slate-400">Play name</label>
        <input
          className={`${input} mb-4 w-full`}
          placeholder="e.g. Power Right, Smash Concept"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <label className="mb-1 block text-sm text-slate-400">Offensive formation</label>
        <select
          className={`${input} mb-4 w-full`}
          value={newFormationId}
          onChange={(e) => setNewFormationId(e.target.value)}
        >
          {offenses.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} ({f.playerCount})
            </option>
          ))}
        </select>
        <label className="mb-1 block text-sm text-slate-400">
          Defensive look (optional, shown ghosted)
        </label>
        <select
          className={`${input} mb-6 w-full`}
          value={newDefenseId}
          onChange={(e) => setNewDefenseId(e.target.value)}
        >
          <option value="">None</option>
          {defenses.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} ({f.playerCount})
            </option>
          ))}
        </select>
        {error && <p className="mb-3 text-sm text-rose-400">{error}</p>}
        <button className={`${btnPrimary} w-full`} onClick={create} disabled={creating}>
          {creating ? "Creating…" : "Start drawing"}
        </button>
      </div>
    );
  }

  if (error) return <p className="mt-8 text-center text-rose-400">{error}</p>;
  if (!play || !bundle)
    return <p className="mt-8 text-center text-slate-400">Loading…</p>;
  if (!offense)
    return (
      <p className="mt-8 text-center text-rose-400">
        This play&apos;s formation was deleted.
      </p>
    );

  const defenses = bundle.formations.filter((f) => f.side === "defense");

  /* ---------------- editor ---------------- */

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Link href={`/t/${joinCode}`} className={btnGhost}>
          ← Playbook
        </Link>
        <input
          className={`${input} min-w-40 flex-1 font-semibold`}
          value={play.name}
          onChange={(e) => setPlay({ ...play, name: e.target.value })}
          aria-label="Play name"
        />
        <SaveStatus state={saveState} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_310px]">
        <div>
          <PlayDiagram
            offense={offense}
            defense={defense}
            routes={play.routes}
            progress={anim.progress}
            selectedId={selectedId}
            showHandles
            svgRef={svgRef}
            onMarkerDown={(id, e) => {
              e.stopPropagation();
              selectPlayer(id);
            }}
            onFieldPointerDown={onFieldTap}
            className="shadow-lg"
          />

          {/* drawing toolbar */}
          <div className="mt-3 flex min-h-11 flex-wrap items-center gap-2">
            {selectedId && selectedRoute ? (
              <>
                <span className="text-sm font-semibold text-slate-300">
                  {offense.players.find((p) => p.id === selectedId)?.label}:
                </span>
                {ROUTE_COLORS.map((c) => (
                  <button
                    key={c}
                    aria-label={`route color ${c}`}
                    onClick={() => updateRoute(selectedId, { color: c })}
                    className={`h-7 w-7 rounded-full border-2 ${selectedRoute.color === c ? "border-white" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <button
                  className={btnGhost}
                  onClick={() =>
                    updateRoute(selectedId, {
                      endStyle:
                        selectedRoute.endStyle === "arrow" ? "block" : "arrow",
                    })
                  }
                >
                  {selectedRoute.endStyle === "arrow" ? "→ Route" : "⊤ Block"}
                </button>
                <button
                  className={btnGhost}
                  disabled={selectedRoute.path.length === 0}
                  onClick={() =>
                    updateRoute(selectedId, {
                      path: selectedRoute.path.slice(0, -1),
                    })
                  }
                >
                  ⌫ Undo point
                </button>
                <button
                  className={btnGhost}
                  disabled={selectedRoute.path.length === 0}
                  onClick={() => updateRoute(selectedId, { path: [] })}
                >
                  Clear
                </button>
                <button
                  className={`${btnGhost} bg-emerald-700 hover:bg-emerald-600`}
                  onClick={() => setSelectedId(null)}
                >
                  ✓ Done
                </button>
              </>
            ) : (
              <>
                <button
                  className={btnGhost}
                  onClick={() => {
                    setSelectedId(null);
                    anim.playing ? anim.reset() : anim.run();
                  }}
                >
                  {anim.playing ? "■ Stop" : "▶ Run play"}
                </button>
                {anim.progress > 0 && !anim.playing && (
                  <button className={btnGhost} onClick={anim.reset}>
                    ↺ Reset
                  </button>
                )}
                <select
                  className={`${input} py-1.5 text-sm`}
                  value={play.defenseFormationId ?? ""}
                  onChange={(e) =>
                    setPlay({ ...play, defenseFormationId: e.target.value || null })
                  }
                  aria-label="Defensive look"
                >
                  <option value="">No defensive look</option>
                  {defenses.map((f) => (
                    <option key={f.id} value={f.id}>
                      vs {f.name}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-slate-500">
                  Tap a player, then tap the field to draw their route.
                </span>
              </>
            )}
          </div>
        </div>

        {/* assignments panel */}
        <div className={`${card} h-fit p-4`}>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
            Assignments
          </h3>
          <ul className="space-y-2">
            {offense.players.map((p) => {
              const r = play.routes[p.id];
              return (
                <li key={p.id} className="flex items-center gap-2">
                  <button
                    onClick={() => selectPlayer(p.id)}
                    className={`w-11 shrink-0 rounded-md px-1 py-1 text-center text-xs font-bold ${
                      p.id === selectedId
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                    }`}
                    style={
                      r && r.path.length > 0 ? { color: r.color } : undefined
                    }
                  >
                    {p.label}
                  </button>
                  <input
                    className={`${input} w-full py-1 text-sm`}
                    placeholder="assignment…"
                    value={r?.assignment ?? ""}
                    onChange={(e) =>
                      updateRoute(p.id, { assignment: e.target.value })
                    }
                  />
                </li>
              );
            })}
          </ul>
          <h3 className="mb-2 mt-5 text-sm font-bold uppercase tracking-wide text-slate-400">
            Coaching notes
          </h3>
          <textarea
            className={`${input} h-24 w-full resize-none text-sm`}
            placeholder="Snap count, motion, coaching points…"
            value={play.notes}
            onChange={(e) => setPlay({ ...play, notes: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
