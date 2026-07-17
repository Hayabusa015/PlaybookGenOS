"use client";

import { Field, fieldPoint } from "./field";
import { Marker } from "./marker";
import { SaveStatus, type SaveState } from "./save-status";
import { rpc } from "@/lib/api";
import { FIELD_W } from "@/lib/field-dims";
import { COUNT_LABELS, PERSONNEL_11, PLAYER_COUNTS, templatePlayers } from "@/lib/templates";
import type { Formation, Side, TeamBundle } from "@/lib/types";
import { btnGhost, btnPrimary, card, input } from "@/lib/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

export function FormationEditor({
  joinCode,
  formationId,
}: {
  joinCode: string;
  formationId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [formation, setFormation] = useState<Formation | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // --- creation form state (only for /formation/new) ---
  const isNew = formationId === "new";
  const [newName, setNewName] = useState("");
  const [newSide, setNewSide] = useState<Side>("offense");
  const [newCount, setNewCount] = useState<number>(11);
  const [newPersonnel, setNewPersonnel] = useState<string>("11");
  const [creating, setCreating] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragId = useRef<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (isNew) return;
    rpc<TeamBundle>("getTeam", { joinCode })
      .then((b) => {
        const f = b.formations.find((x) => x.id === formationId);
        if (!f) setError("Formation not found");
        else setFormation(f);
      })
      .catch((e) => setError(e.message));
  }, [joinCode, formationId, isNew]);

  // Debounced autosave whenever the formation changes after initial load,
  // with a flush on unmount so fast navigation never drops the last edit.
  const unsaved = useRef<Formation | null>(null);
  useEffect(() => {
    if (!formation) return;
    if (!loaded.current) {
      loaded.current = true;
      return;
    }
    setSaveState("dirty");
    unsaved.current = formation;
    const t = setTimeout(() => {
      setSaveState("saving");
      unsaved.current = null;
      rpc("saveFormation", { joinCode, formation })
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("error"));
    }, 700);
    return () => clearTimeout(t);
  }, [formation, joinCode]);
  useEffect(
    () => () => {
      if (unsaved.current)
        rpc("saveFormation", { joinCode, formation: unsaved.current });
    },
    [joinCode],
  );

  const create = async () => {
    setCreating(true);
    setError("");
    try {
      const personnelId = newSide === "offense" && newCount === 11 ? newPersonnel : undefined;
      const pkg = personnelId ? PERSONNEL_11.find((p) => p.id === personnelId) : undefined;
      const defaultName = pkg
        ? `${pkg.label} (${pkg.description})`
        : `${newSide === "offense" ? "Offense" : "Defense"} ${newCount}`;
      const f: Formation = {
        id: crypto.randomUUID(),
        teamId: "",
        name: newName.trim() || defaultName,
        side: newSide,
        playerCount: newCount,
        players: templatePlayers(newSide, newCount, personnelId),
        createdAt: new Date().toISOString(),
      };
      const { formation: saved } = await rpc<{ formation: Formation }>(
        "saveFormation",
        { joinCode, formation: f },
      );
      loaded.current = true;
      setFormation(saved);
      router.replace(`/t/${joinCode}/formation/${saved.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
      setCreating(false);
    }
  };

  const movePlayer = useCallback((id: string, x: number, y: number) => {
    setFormation((f) =>
      f
        ? {
            ...f,
            players: f.players.map((p) => (p.id === id ? { ...p, x, y } : p)),
          }
        : f,
    );
  }, []);

  const onMarkerDown = (id: string) => (e: ReactPointerEvent<SVGGElement>) => {
    e.stopPropagation();
    setSelectedId(id);
    dragId.current = id;
    const move = (ev: PointerEvent) => {
      if (!svgRef.current || !dragId.current) return;
      const [x, y] = fieldPoint(svgRef.current, ev);
      movePlayer(dragId.current, x, y);
    };
    const up = () => {
      dragId.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const selected = formation?.players.find((p) => p.id === selectedId);

  // Flip the formation left/right, swapping side-specific line labels.
  const MIRROR_LABELS: Record<string, string> = {
    LT: "RT", RT: "LT", LG: "RG", RG: "LG", LE: "RE", RE: "LE",
  };
  const mirror = () =>
    setFormation((f) =>
      f
        ? {
            ...f,
            players: f.players.map((p) => ({
              ...p,
              x: FIELD_W - p.x,
              label: MIRROR_LABELS[p.label] ?? p.label,
            })),
          }
        : f,
    );

  if (isNew && !formation) {
    return (
      <div className={`${card} mx-auto mt-8 max-w-md p-6`}>
        <h2 className="mb-4 text-lg font-bold text-white">New formation</h2>
        <label className="mb-1 block text-sm text-neutral-400">Name</label>
        <input
          className={`${input} mb-4 w-full`}
          placeholder="e.g. I-Form Right, 4-3 Base"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <label className="mb-1 block text-sm text-neutral-400">Side of the ball</label>
        <div className="mb-4 flex gap-2">
          {(["offense", "defense"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setNewSide(s)}
              className={`${btnGhost} flex-1 ${newSide === s ? "ring-2 ring-amber-500" : ""}`}
            >
              {s === "offense" ? "⭘ Offense" : "✕ Defense"}
            </button>
          ))}
        </div>
        <label className="mb-1 block text-sm text-neutral-400">Players per side</label>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {PLAYER_COUNTS.map((c) => (
            <button
              key={c}
              onClick={() => setNewCount(c)}
              className={`${btnGhost} ${newCount === c ? "ring-2 ring-amber-500" : ""}`}
            >
              {COUNT_LABELS[c]}
            </button>
          ))}
        </div>
        {newSide === "offense" && newCount === 11 && (
          <>
            <label className="mb-1 block text-sm text-neutral-400">Personnel package</label>
            <div className="mb-6 grid grid-cols-1 gap-1.5">
              {PERSONNEL_11.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => setNewPersonnel(pkg.id)}
                  className={`${btnGhost} text-left ${newPersonnel === pkg.id ? "ring-2 ring-amber-500" : ""}`}
                >
                  <span className="font-bold">{pkg.label}</span>
                  <span className="ml-2 text-neutral-400">{pkg.description}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {(newSide === "defense" || newCount !== 11) && <div className="mb-2" />}
        {error && <p className="mb-3 text-sm text-rose-400">{error}</p>}
        <button className={`${btnPrimary} w-full`} onClick={create} disabled={creating}>
          {creating ? "Creating…" : "Create & place players"}
        </button>
      </div>
    );
  }

  if (error) return <p className="mt-8 text-center text-rose-400">{error}</p>;
  if (!formation) return <p className="mt-8 text-center text-neutral-400">Loading…</p>;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Link href={`/t/${joinCode}`} className={btnGhost}>
          ← Playbook
        </Link>
        <input
          className={`${input} min-w-40 flex-1 font-semibold`}
          value={formation.name}
          onChange={(e) => setFormation({ ...formation, name: e.target.value })}
          aria-label="Formation name"
        />
        <SaveStatus state={saveState} />
      </div>

      <Field svgRef={svgRef} className="shadow-lg">
        {formation.players.map((p) => (
          <Marker
            key={p.id}
            x={p.x}
            y={p.y}
            label={p.label}
            side={formation.side}
            selected={p.id === selectedId}
            onPointerDown={onMarkerDown(p.id)}
          />
        ))}
      </Field>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {selected ? (
          <>
            <span className="text-sm text-neutral-400">Position label:</span>
            <input
              className={`${input} w-24 text-center font-bold uppercase`}
              value={selected.label}
              maxLength={3}
              onChange={(e) =>
                setFormation({
                  ...formation,
                  players: formation.players.map((p) =>
                    p.id === selected.id
                      ? { ...p, label: e.target.value.toUpperCase() }
                      : p,
                  ),
                })
              }
            />
            <button className={btnGhost} onClick={() => setSelectedId(null)}>
              Done
            </button>
          </>
        ) : (
          <>
            <button className={btnGhost} onClick={mirror} title="Flip the formation left ↔ right">
              ⇄ Mirror
            </button>
            <p className="text-sm text-neutral-500">
              Drag players into position. Tap a player to rename their spot (QB, X, MIKE…).
            </p>
          </>
        )}
      </div>
    </div>
  );
}
