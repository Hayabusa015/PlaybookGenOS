"use client";

import { Field } from "@/components/field";
import { Marker } from "@/components/marker";
import { PlayDiagram } from "@/components/play-diagram";
import { downloadPlaybook, rememberTeam, rpc } from "@/lib/api";
import type { Formation, Play, TeamBundle } from "@/lib/types";
import { btnDanger, btnGhost, btnPrimary, card } from "@/lib/ui";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

function FormationThumb({ f }: { f: Formation }) {
  return (
    <Field className="pointer-events-none">
      {f.players.map((p) => (
        <Marker key={p.id} x={p.x} y={p.y} label={p.label} side={f.side} />
      ))}
    </Field>
  );
}

function CopyChip({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className={`${btnGhost} font-mono`}
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      title={`Copy ${label}`}
    >
      {copied ? "✓ Copied" : `${label}: ${value}`}
    </button>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SidebarSection({
  side,
  formations,
  plays,
  joinCode,
  selectedId,
  onSelect,
}: {
  side: "offense" | "defense";
  formations: Formation[];
  plays: Play[];
  joinCode: string;
  selectedId: string | null;
  onSelect: (id: string, type: "formation" | "play") => void;
}) {
  const [open, setOpen] = useState(true);
  const sideFormations = formations.filter((f) => f.side === side);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 py-1.5 text-sm font-bold uppercase tracking-wide text-neutral-300 hover:text-white"
      >
        <ChevronIcon open={open} />
        {side === "offense" ? "Offense" : "Defense"} ({sideFormations.length})
      </button>
      {open && (
        <div className="ml-2 border-l border-neutral-800 pl-2">
          {sideFormations.map((f) => (
            <FormationNode
              key={f.id}
              formation={f}
              plays={plays.filter((p) => p.formationId === f.id)}
              joinCode={joinCode}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
          <Link
            href={`/t/${joinCode}/formation/new`}
            className="block py-1 text-sm text-amber-400 hover:text-amber-300"
          >
            + New formation
          </Link>
        </div>
      )}
    </div>
  );
}

function FormationNode({
  formation,
  plays,
  joinCode,
  selectedId,
  onSelect,
}: {
  formation: Formation;
  plays: Play[];
  joinCode: string;
  selectedId: string | null;
  onSelect: (id: string, type: "formation" | "play") => void;
}) {
  const [open, setOpen] = useState(true);
  const isSelected = selectedId === formation.id;

  return (
    <div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setOpen(!open)}
          className="shrink-0 text-neutral-500 hover:text-neutral-300"
        >
          <ChevronIcon open={open} />
        </button>
        <button
          onClick={() => onSelect(formation.id, "formation")}
          className={`flex-1 truncate rounded-md px-1.5 py-1 text-left text-sm font-semibold transition-colors ${
            isSelected
              ? "bg-amber-500/15 text-amber-300"
              : "text-neutral-200 hover:bg-neutral-800/70 hover:text-white"
          }`}
        >
          {formation.name}
          <span className="ml-1 text-xs font-normal text-neutral-500">
            ({formation.playerCount})
          </span>
        </button>
      </div>
      {open && (
        <div className="ml-5 border-l border-neutral-800 pl-2">
          {plays.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id, "play")}
              className={`block w-full truncate rounded-md px-1.5 py-0.5 text-left text-sm transition-colors ${
                selectedId === p.id
                  ? "bg-amber-500/15 font-semibold text-amber-300"
                  : "text-neutral-400 hover:bg-neutral-800/70 hover:text-neutral-200"
              }`}
            >
              {p.name}
            </button>
          ))}
          {formation.side === "offense" && (
            <Link
              href={`/t/${joinCode}/play/new`}
              className="block py-0.5 text-xs text-amber-400/70 hover:text-amber-400"
            >
              + New play
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return mobile;
}

export default function TeamDashboard() {
  const { code } = useParams<{ code: string }>();
  const joinCode = decodeURIComponent(code).toUpperCase();
  const router = useRouter();

  const isMobile = useIsMobile();
  const [bundle, setBundle] = useState<TeamBundle | null>(null);
  const [error, setError] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"formation" | "play">("play");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    if (!moreOpen) return;
    const close = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node))
        setMoreOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [moreOpen]);

  const load = useCallback(() => {
    rpc<TeamBundle>("getTeam", { joinCode })
      .then((b) => {
        setBundle(b);
        rememberTeam({ joinCode: b.team.joinCode, name: b.team.name });
      })
      .catch((e) => setError(e.message));
  }, [joinCode]);

  useEffect(load, [load]);

  const deleteFormation = async (id: string, name: string) => {
    if (
      !confirm(
        `Delete formation "${name}"? Plays built on it will be deleted too.`,
      )
    )
      return;
    await rpc("deleteFormation", { joinCode, id });
    if (selectedId === id) setSelectedId(null);
    load();
  };

  const deletePlay = async (id: string, name: string) => {
    if (!confirm(`Delete play "${name}"?`)) return;
    await rpc("deletePlay", { joinCode, id });
    if (selectedId === id) setSelectedId(null);
    load();
  };

  const duplicatePlay = async (p: Play) => {
    const copy: Play = {
      ...p,
      id: crypto.randomUUID(),
      name: `${p.name} copy`,
      createdAt: new Date().toISOString(),
    };
    await rpc("savePlay", { joinCode, play: copy });
    setSelectedId(copy.id);
    setSelectedType("play");
    load();
  };

  const duplicateFormation = async (f: Formation) => {
    const copy: Formation = {
      ...f,
      id: crypto.randomUUID(),
      name: `${f.name} copy`,
      players: f.players.map((pl) => ({ ...pl, id: crypto.randomUUID() })),
      createdAt: new Date().toISOString(),
    };
    await rpc("saveFormation", { joinCode, formation: copy });
    setSelectedId(copy.id);
    setSelectedType("formation");
    load();
  };

  const onImportFile = async (file: File) => {
    setImportMsg("Importing…");
    try {
      const parsed = JSON.parse(await file.text());
      const { formationCount, playCount } = await rpc<{
        formationCount: number;
        playCount: number;
      }>("importPlaybook", { joinCode, file: parsed });
      setImportMsg(`Imported ${formationCount} formations, ${playCount} plays`);
      load();
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : "Import failed");
    }
    setTimeout(() => setImportMsg(""), 4000);
  };

  const onSelect = (id: string, type: "formation" | "play") => {
    setSelectedId(id);
    setSelectedType(type);
    if (isMobile) setSidebarOpen(false);
  };

  if (error)
    return (
      <main className="flex-1 px-4 py-16 text-center">
        <p className="text-rose-400">{error}</p>
        <Link href="/" className={`${btnGhost} mt-4`}>
          ← Home
        </Link>
      </main>
    );
  if (!bundle)
    return <p className="flex-1 py-16 text-center text-neutral-400">Loading…</p>;

  const { team, formations, plays, comments } = bundle;
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/s/${team.shareCode}`
      : `/s/${team.shareCode}`;
  const commentCount = (playId: string) =>
    comments.filter((c) => c.playId === playId).length;
  const formationName = (id: string) =>
    formations.find((f) => f.id === id)?.name ?? "?";

  const selectedPlay = selectedType === "play" ? plays.find((p) => p.id === selectedId) : null;
  const selectedFormation = selectedType === "formation" ? formations.find((f) => f.id === selectedId) : null;

  // Sidebar quick-filter: match play names; keep formations that match by
  // name or still contain a matching play.
  const q = filter.trim().toLowerCase();
  const navPlays = q ? plays.filter((p) => p.name.toLowerCase().includes(q)) : plays;
  const navFormations = q
    ? formations.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          navPlays.some((p) => p.formationId === f.id),
      )
    : formations;

  return (
    <main className="flex h-screen flex-col">
      {/* top bar */}
      <div className="flex items-center gap-2 border-b border-neutral-800 px-3 py-2 md:gap-3 md:px-4 md:py-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="shrink-0 text-neutral-400 hover:text-white md:hidden"
          aria-label="Toggle sidebar"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link href="/" className="text-xl md:text-2xl" title="Home">
          🏈
        </Link>
        <h1 className="mr-auto truncate text-base font-black text-white md:text-xl">
          {team.name}
        </h1>

        {/* desktop actions */}
        <div className="hidden items-center gap-2 md:flex">
          <CopyChip label="Coach code" value={team.joinCode} />
          <CopyChip label="Share (read-only)" value={shareUrl} />
          <Link href={`/t/${joinCode}/print`} className={btnGhost}>
            🖨 Print / PDF
          </Link>
          <button className={btnGhost} onClick={() => downloadPlaybook(bundle)}>
            ⬇ Export file
          </button>
          <button className={btnGhost} onClick={() => fileRef.current?.click()}>
            ⬆ Import file
          </button>
        </div>

        {/* mobile more menu */}
        <div className="relative md:hidden" ref={moreRef}>
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={btnGhost}
            aria-label="More actions"
          >
            ⋯
          </button>
          {moreOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-neutral-700 bg-neutral-900 p-2 shadow-xl">
              <div className="mb-1">
                <CopyChip label="Coach code" value={team.joinCode} />
              </div>
              <div className="mb-1">
                <CopyChip label="Share" value={shareUrl} />
              </div>
              <Link
                href={`/t/${joinCode}/print`}
                className={`${btnGhost} mb-1 block w-full text-left`}
                onClick={() => setMoreOpen(false)}
              >
                🖨 Print / PDF
              </Link>
              <button
                className={`${btnGhost} mb-1 w-full text-left`}
                onClick={() => {
                  downloadPlaybook(bundle);
                  setMoreOpen(false);
                }}
              >
                ⬇ Export file
              </button>
              <button
                className={`${btnGhost} w-full text-left`}
                onClick={() => {
                  fileRef.current?.click();
                  setMoreOpen(false);
                }}
              >
                ⬆ Import file
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImportFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {importMsg && <p className="px-4 py-2 text-sm text-amber-400">{importMsg}</p>}

      <div className="relative flex flex-1 overflow-hidden">
        {/* mobile backdrop */}
        {isMobile && sidebarOpen && (
          <div
            className="absolute inset-0 z-30 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* sidebar */}
        <aside
          className={`absolute inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-neutral-800 bg-neutral-950 transition-transform md:relative md:z-auto ${
            sidebarOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden md:border-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2">
            <span className="text-sm font-bold uppercase tracking-wide text-neutral-400">
              Playbook
            </span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-neutral-500 hover:text-neutral-300"
              title="Collapse sidebar"
            >
              ✕
            </button>
          </div>
          <div className="px-3 pt-3">
            <input
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-sm text-neutral-200 placeholder-neutral-600 outline-none focus:border-amber-500/60"
              placeholder="Filter plays…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <nav className="flex-1 overflow-y-auto p-3 space-y-2">
            <SidebarSection
              side="offense"
              formations={navFormations}
              plays={navPlays}
              joinCode={joinCode}
              selectedId={selectedId}
              onSelect={onSelect}
            />
            <SidebarSection
              side="defense"
              formations={navFormations}
              plays={navPlays}
              joinCode={joinCode}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          </nav>
          <div className="border-t border-neutral-800 p-3 text-xs text-neutral-600">
            {formations.length} formations · {plays.length} plays
          </div>
        </aside>

        {/* desktop collapse toggle when sidebar is closed */}
        {!sidebarOpen && !isMobile && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="hidden items-center border-r border-neutral-800 bg-neutral-900 px-2 text-neutral-400 hover:text-white md:flex"
            title="Open sidebar"
          >
            ▶
          </button>
        )}

        {/* main content area */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6">
          {selectedPlay ? (() => {
            const offense = formations.find((f) => f.id === selectedPlay.formationId);
            if (!offense) return <p className="text-rose-400">Formation deleted.</p>;
            return (
              <div>
                <div className="mb-4 flex flex-wrap items-center gap-2 md:gap-3">
                  <h2 className="text-lg font-bold text-white md:text-xl">{selectedPlay.name}</h2>
                  <span className="text-sm text-neutral-500">{offense.name}</span>
                  <div className="ml-auto flex flex-wrap gap-2">
                    <Link
                      href={`/t/${joinCode}/play/${selectedPlay.id}`}
                      className={btnGhost}
                    >
                      Edit play
                    </Link>
                    <button
                      className={btnGhost}
                      onClick={() => duplicatePlay(selectedPlay)}
                      title="Make a copy of this play"
                    >
                      ⧉ Duplicate
                    </button>
                    <button
                      className={btnDanger}
                      onClick={() => deletePlay(selectedPlay.id, selectedPlay.name)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="max-w-3xl">
                  <PlayDiagram
                    offense={offense}
                    defense={
                      formations.find((f) => f.id === selectedPlay.defenseFormationId) ?? null
                    }
                    routes={selectedPlay.routes}
                    className="shadow-lg"
                  />
                </div>
                {selectedPlay.createdBy && (
                  <p className="mt-3 text-sm text-neutral-500">
                    Created by {selectedPlay.createdBy}
                    {commentCount(selectedPlay.id) > 0 &&
                      ` · 💬 ${commentCount(selectedPlay.id)} suggestions`}
                  </p>
                )}
              </div>
            );
          })() : selectedFormation ? (
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2 md:gap-3">
                <h2 className="text-lg font-bold text-white md:text-xl">{selectedFormation.name}</h2>
                <span className="text-sm text-neutral-500">
                  {selectedFormation.side} · {selectedFormation.playerCount} players
                </span>
                <div className="ml-auto flex flex-wrap gap-2">
                  <Link
                    href={`/t/${joinCode}/formation/${selectedFormation.id}`}
                    className={btnGhost}
                  >
                    Edit formation
                  </Link>
                  <button
                    className={btnGhost}
                    onClick={() => duplicateFormation(selectedFormation)}
                    title="Make a copy of this formation"
                  >
                    ⧉ Duplicate
                  </button>
                  <button
                    className={btnDanger}
                    onClick={() => deleteFormation(selectedFormation.id, selectedFormation.name)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="max-w-3xl">
                <FormationThumb f={selectedFormation} />
              </div>
              {plays.filter((p) => p.formationId === selectedFormation.id).length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-400">
                    Plays using this formation
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {plays
                      .filter((p) => p.formationId === selectedFormation.id)
                      .map((p) => (
                        <button
                          key={p.id}
                          onClick={() => onSelect(p.id, "play")}
                          className={`${card} group overflow-hidden text-left transition-all hover:-translate-y-0.5 hover:border-amber-500/60 hover:shadow-lg hover:shadow-black/50`}
                        >
                          <PlayDiagram
                            offense={selectedFormation}
                            defense={
                              formations.find((f) => f.id === p.defenseFormationId) ?? null
                            }
                            routes={p.routes}
                            className="pointer-events-none rounded-b-none"
                          />
                          <div className="p-3">
                            <p className="font-bold text-white group-hover:text-amber-300">
                              {p.name}
                            </p>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* default: show all plays grid */
            <div>
              <h2 className="mb-4 text-lg font-bold text-white">
                All plays ({plays.length})
              </h2>
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Link
                  href={`/t/${joinCode}/play/new`}
                  className="flex min-h-40 items-center justify-center rounded-xl border-2 border-dashed border-neutral-800 text-lg font-bold text-amber-400 transition-colors hover:border-amber-500/60 hover:bg-neutral-900/60"
                >
                  + New play
                </Link>
                {plays.map((p) => {
                  const offense = formations.find((f) => f.id === p.formationId);
                  return (
                    <button
                      key={p.id}
                      onClick={() => onSelect(p.id, "play")}
                      className={`${card} group overflow-hidden text-left transition-all hover:-translate-y-0.5 hover:border-amber-500/60 hover:shadow-lg hover:shadow-black/50`}
                    >
                      {offense ? (
                        <PlayDiagram
                          offense={offense}
                          defense={
                            formations.find((f) => f.id === p.defenseFormationId) ?? null
                          }
                          routes={p.routes}
                          className="pointer-events-none rounded-b-none"
                        />
                      ) : (
                        <div className="flex h-32 items-center justify-center text-neutral-500">
                          formation deleted
                        </div>
                      )}
                      <div className="p-3">
                        <p className="font-bold text-white group-hover:text-amber-300">
                          {p.name}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-neutral-400">
                            {formationName(p.formationId)}
                          </span>
                          {p.createdBy && (
                            <span className="text-neutral-600">{p.createdBy}</span>
                          )}
                          {commentCount(p.id) > 0 && (
                            <span className="text-neutral-500">
                              💬 {commentCount(p.id)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {plays.length === 0 && (
                  <div className="flex items-center text-sm text-neutral-500 sm:col-span-1">
                    No plays yet — start with a formation, then draw your first play.
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
