"use client";

import { Field } from "@/components/field";
import { Marker } from "@/components/marker";
import { PlayDiagram } from "@/components/play-diagram";
import { downloadPlaybook, rememberTeam, rpc } from "@/lib/api";
import type { Formation, TeamBundle } from "@/lib/types";
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

export default function TeamDashboard() {
  const { code } = useParams<{ code: string }>();
  const joinCode = decodeURIComponent(code).toUpperCase();
  const router = useRouter();

  const [bundle, setBundle] = useState<TeamBundle | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"plays" | "formations">("plays");
  const [importMsg, setImportMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

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
    load();
  };

  const deletePlay = async (id: string, name: string) => {
    if (!confirm(`Delete play "${name}"?`)) return;
    await rpc("deletePlay", { joinCode, id });
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
    return <p className="flex-1 py-16 text-center text-slate-400">Loading…</p>;

  const { team, formations, plays, comments } = bundle;
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/s/${team.shareCode}`
      : `/s/${team.shareCode}`;
  const commentCount = (playId: string) =>
    comments.filter((c) => c.playId === playId).length;
  const formationName = (id: string) =>
    formations.find((f) => f.id === id)?.name ?? "?";

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/" className="text-2xl" title="Home">
          🏈
        </Link>
        <h1 className="mr-auto text-2xl font-black text-white">{team.name}</h1>
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
      {importMsg && <p className="mb-4 text-sm text-emerald-400">{importMsg}</p>}

      <div className="mb-5 flex gap-2">
        {(["plays", "formations"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold capitalize ${
              tab === t
                ? "bg-emerald-500 text-emerald-950"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {t} ({t === "plays" ? plays.length : formations.length})
          </button>
        ))}
      </div>

      {tab === "plays" && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href={`/t/${joinCode}/play/new`}
            className={`${card} flex min-h-40 items-center justify-center text-lg font-bold text-emerald-400 hover:border-emerald-600`}
          >
            + New play
          </Link>
          {plays.map((p) => {
            const offense = formations.find((f) => f.id === p.formationId);
            return (
              <div key={p.id} className={`${card} overflow-hidden`}>
                <Link href={`/t/${joinCode}/play/${p.id}`} className="block">
                  {offense ? (
                    <PlayDiagram
                      offense={offense}
                      defense={
                        formations.find((f) => f.id === p.defenseFormationId) ??
                        null
                      }
                      routes={p.routes}
                      className="pointer-events-none rounded-b-none"
                    />
                  ) : (
                    <div className="flex h-32 items-center justify-center text-slate-500">
                      formation deleted
                    </div>
                  )}
                </Link>
                <div className="flex items-center gap-2 p-3">
                  <div className="mr-auto">
                    <Link
                      href={`/t/${joinCode}/play/${p.id}`}
                      className="font-bold text-white hover:text-emerald-400"
                    >
                      {p.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {formationName(p.formationId)}
                      {p.createdBy && ` · ${p.createdBy}`}
                      {commentCount(p.id) > 0 &&
                        ` · 💬 ${commentCount(p.id)}`}
                    </p>
                  </div>
                  <button
                    className={btnDanger}
                    onClick={() => deletePlay(p.id, p.name)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
          {plays.length === 0 && (
            <div className="flex items-center text-sm text-slate-500 sm:col-span-1">
              No plays yet — start with a formation, then draw your first play.
            </div>
          )}
        </section>
      )}

      {tab === "formations" && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href={`/t/${joinCode}/formation/new`}
            className={`${card} flex min-h-40 items-center justify-center text-lg font-bold text-emerald-400 hover:border-emerald-600`}
          >
            + New formation
          </Link>
          {formations.map((f) => (
            <div key={f.id} className={`${card} overflow-hidden`}>
              <Link href={`/t/${joinCode}/formation/${f.id}`} className="block">
                <FormationThumb f={f} />
              </Link>
              <div className="flex items-center gap-2 p-3">
                <div className="mr-auto">
                  <Link
                    href={`/t/${joinCode}/formation/${f.id}`}
                    className="font-bold text-white hover:text-emerald-400"
                  >
                    {f.name}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {f.side} · {f.playerCount} players
                  </p>
                </div>
                <button
                  className={btnDanger}
                  onClick={() => deleteFormation(f.id, f.name)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      <p className="mt-10 text-xs text-slate-600">
        Coaches join with code <span className="font-mono">{team.joinCode}</span>{" "}
        (full edit access). Send the read-only share link to your youth program
        or players — they can view plays, run the animations, and leave
        suggestions, but can&apos;t change anything.
      </p>
    </main>
  );
}
