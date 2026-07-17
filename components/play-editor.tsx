"use client";

import { fieldPoint } from "./field";
import { PlayDiagram, usePlayAnimation } from "./play-diagram";
import { SaveStatus, type SaveState } from "./save-status";
import { AUTO_COLOR, ToolRail } from "./tool-rail";
import { getCoachName, rpc } from "@/lib/api";
import { getPositionColor } from "@/lib/templates";
import type { Formation, Play, PlayerRoute, RouteEndStyle, TeamBundle } from "@/lib/types";
import { btnGhost, btnPrimary, card, input } from "@/lib/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Pt } from "@/lib/geometry";

const emptyRoute = (color: string, endStyle: RouteEndStyle): PlayerRoute => ({
  path: [],
  endStyle,
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
  const [tool, setTool] = useState<"route" | "block">("route");
  const [currentColor, setCurrentColor] = useState<string>(AUTO_COLOR);

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

  // Debounced autosave, with a flush on unmount so fast navigation
  // never drops the last edit.
  const unsaved = useRef<Play | null>(null);
  useEffect(() => {
    if (!play) return;
    if (!loaded.current) {
      loaded.current = true;
      return;
    }
    setSaveState("dirty");
    unsaved.current = play;
    const t = setTimeout(() => {
      setSaveState("saving");
      unsaved.current = null;
      rpc("savePlay", { joinCode, play })
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("error"));
    }, 700);
    return () => clearTimeout(t);
  }, [play, joinCode]);
  useEffect(
    () => () => {
      if (unsaved.current) rpc("savePlay", { joinCode, play: unsaved.current });
    },
    [joinCode],
  );

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

  const labelOf = (playerId: string) =>
    offense?.players.find((p) => p.id === playerId)?.label ?? "";
  const resolveColor = (playerId: string) =>
    currentColor === AUTO_COLOR
      ? getPositionColor(labelOf(playerId))
      : currentColor;

  const updateRoute = (playerId: string, patch: Partial<PlayerRoute>) => {
    setPlay((pl) => {
      if (!pl) return pl;
      const existing =
        pl.routes[playerId] ??
        emptyRoute(resolveColor(playerId), tool === "block" ? "block" : "arrow");
      return {
        ...pl,
        routes: { ...pl.routes, [playerId]: { ...existing, ...patch } },
      };
    });
  };

  const selectPlayer = (id: string) => {
    anim.reset();
    setSelectedId(id);
    const r = play?.routes[id];
    if (r) {
      // Sync the rail to the route being edited.
      setTool(r.endStyle === "block" ? "block" : "route");
      setCurrentColor(
        r.color === getPositionColor(labelOf(id)) ? AUTO_COLOR : r.color,
      );
    } else if (play) {
      updateRoute(id, {});
    }
  };

  const applyTool = (t: "route" | "block") => {
    setTool(t);
    if (selectedId && play?.routes[selectedId])
      updateRoute(selectedId, { endStyle: t === "block" ? "block" : "arrow" });
  };

  const applyColor = (c: string) => {
    setCurrentColor(c);
    if (selectedId && play?.routes[selectedId])
      updateRoute(selectedId, {
        color:
          c === AUTO_COLOR ? getPositionColor(labelOf(selectedId)) : c,
      });
  };

  const onFieldTap = (p: Pt) => {
    if (!selectedId || !play || anim.playing) return;
    const route = play.routes[selectedId];
    updateRoute(selectedId, { path: [...(route?.path ?? []), p] });
  };

  // Drag an existing route point to reshape the route.
  const onHandleDown = (
    playerId: string,
    idx: number,
    e: { stopPropagation(): void },
  ) => {
    e.stopPropagation();
    const move = (ev: PointerEvent) => {
      if (!svgRef.current) return;
      const pt = fieldPoint(svgRef.current, ev);
      setPlay((pl) => {
        if (!pl) return pl;
        const r = pl.routes[playerId];
        if (!r) return pl;
        return {
          ...pl,
          routes: {
            ...pl.routes,
            [playerId]: { ...r, path: r.path.map((q, i) => (i === idx ? pt : q)) },
          },
        };
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const selectedRoute = selectedId && play ? play.routes[selectedId] : null;

  /* ---------------- creation form ---------------- */

  if (isNew && !play) {
    if (!bundle && !error)
      return <p className="mt-8 text-center text-neutral-400">Loading…</p>;
    const offenses = bundle?.formations.filter((f) => f.side === "offense") ?? [];
    const defenses = bundle?.formations.filter((f) => f.side === "defense") ?? [];
    if (offenses.length === 0)
      return (
        <div className={`${card} mx-auto mt-8 max-w-md p-6 text-center`}>
          <p className="mb-4 text-neutral-300">
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
        <label className="mb-1 block text-sm text-neutral-400">Play name</label>
        <input
          className={`${input} mb-4 w-full`}
          placeholder="e.g. Power Right, Smash Concept"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <label className="mb-1 block text-sm text-neutral-400">Offensive formation</label>
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
        <label className="mb-1 block text-sm text-neutral-400">
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
    return <p className="mt-8 text-center text-neutral-400">Loading…</p>;
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
        <div className="flex flex-col gap-3 sm:flex-row">
          <ToolRail
            tool={tool}
            onTool={applyTool}
            color={currentColor}
            onColor={applyColor}
            hasSelection={Boolean(selectedId && selectedRoute)}
            routeLength={selectedRoute?.path.length ?? 0}
            onUndo={() =>
              selectedId &&
              selectedRoute &&
              updateRoute(selectedId, { path: selectedRoute.path.slice(0, -1) })
            }
            onClear={() => selectedId && updateRoute(selectedId, { path: [] })}
            onDone={() => setSelectedId(null)}
            playing={anim.playing}
            progress={anim.progress}
            onRun={() => {
              setSelectedId(null);
              anim.playing ? anim.reset() : anim.run();
            }}
            onReset={anim.reset}
          />
          <div className="min-w-0 flex-1">
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
              onHandleDown={onHandleDown}
              className="shadow-lg"
            />
            {/* fixed height so swapping between states never shifts the layout */}
            <div className="mt-3 flex min-h-11 flex-wrap items-center gap-2">
              {selectedId && selectedRoute ? (
                <span className="text-sm text-neutral-500">
                  <span className="font-bold text-neutral-200">
                    {labelOf(selectedId)}
                  </span>{" "}
                  — tap the field to add points, drag the dots to reshape, then
                  ✓ when done.
                </span>
              ) : (
                <>
                  <select
                    className={`${input} py-1.5 text-sm`}
                    value={play.defenseFormationId ?? ""}
                    onChange={(e) =>
                      setPlay({
                        ...play,
                        defenseFormationId: e.target.value || null,
                      })
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
                  <span className="text-sm text-neutral-500">
                    Tap a player, then tap the field to draw their route.
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* assignments panel */}
        <div className={`${card} h-fit p-4`}>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-400">
            Assignments
          </h3>
          <ul className="space-y-2">
            {offense.players.map((p) => {
              const r = play.routes[p.id];
              return (
                <li key={p.id} className="flex items-center gap-2">
                  <button
                    onClick={() => selectPlayer(p.id)}
                    className={`w-11 shrink-0 rounded-md px-1 py-1 text-center text-xs font-bold text-white ${
                      p.id === selectedId
                        ? "ring-2 ring-amber-400 ring-offset-1 ring-offset-neutral-900"
                        : "hover:brightness-110"
                    }`}
                    style={{ backgroundColor: getPositionColor(p.label) }}
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
          <h3 className="mb-2 mt-5 text-sm font-bold uppercase tracking-wide text-neutral-400">
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
