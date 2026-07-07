"use client";

import { AssignmentList } from "@/components/assignment-list";
import { Comments } from "@/components/comments";
import { AnimatedPlay, PlayDiagram } from "@/components/play-diagram";
import { rpc } from "@/lib/api";
import type { Formation, Play, PlayComment, Team } from "@/lib/types";
import { btnGhost, card } from "@/lib/ui";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface SharedBundle {
  team: Pick<Team, "id" | "name" | "shareCode">;
  formations: Formation[];
  plays: Play[];
  comments: PlayComment[];
}

export default function SharedPlaybook() {
  const { code } = useParams<{ code: string }>();
  const shareCode = decodeURIComponent(code).toUpperCase();

  const [bundle, setBundle] = useState<SharedBundle | null>(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    rpc<SharedBundle>("getShared", { shareCode })
      .then(setBundle)
      .catch((e) => setError(e.message));
  }, [shareCode]);

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
  const selected = plays.find((p) => p.id === selectedId) ?? null;
  const offenseOf = (p: Play) =>
    formations.find((f) => f.id === p.formationId) ?? null;
  const defenseOf = (p: Play) =>
    formations.find((f) => f.id === p.defenseFormationId) ?? null;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <span className="text-2xl">🏈</span>
        <div className="mr-auto">
          <h1 className="text-2xl font-black text-white">{team.name}</h1>
          <p className="text-xs uppercase tracking-wide text-amber-400">
            Shared playbook · view only
          </p>
        </div>
        {selected && (
          <button className={btnGhost} onClick={() => setSelectedId(null)}>
            ← All plays ({plays.length})
          </button>
        )}
      </header>

      {!selected ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plays.map((p) => {
            const offense = offenseOf(p);
            return (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`${card} overflow-hidden text-left hover:border-emerald-600`}
              >
                {offense && (
                  <PlayDiagram
                    offense={offense}
                    defense={defenseOf(p)}
                    routes={p.routes}
                    className="pointer-events-none rounded-b-none"
                  />
                )}
                <div className="p-3">
                  <p className="font-bold text-white">{p.name}</p>
                  <p className="text-xs text-slate-500">
                    {offense?.name}
                    {comments.some((c) => c.playId === p.id) &&
                      ` · 💬 ${comments.filter((c) => c.playId === p.id).length}`}
                  </p>
                </div>
              </button>
            );
          })}
          {plays.length === 0 && (
            <p className="text-slate-500">This playbook has no plays yet.</p>
          )}
        </section>
      ) : (
        (() => {
          const offense = offenseOf(selected);
          if (!offense)
            return <p className="text-rose-400">Play formation missing.</p>;
          return (
            <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
              <div>
                <h2 className="mb-3 text-xl font-bold text-white">
                  {selected.name}
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    {offense.name}
                  </span>
                </h2>
                <AnimatedPlay
                  offense={offense}
                  defense={defenseOf(selected)}
                  routes={selected.routes}
                  className="shadow-lg"
                />
                {selected.notes && (
                  <div className={`${card} mt-4 p-4`}>
                    <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-400">
                      Coaching notes
                    </h3>
                    <p className="whitespace-pre-wrap text-sm text-slate-200">
                      {selected.notes}
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-5">
                <div className={`${card} p-4`}>
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">
                    Assignments
                  </h3>
                  <AssignmentList offense={offense} play={selected} />
                </div>
                <div className={`${card} p-4`}>
                  <Comments
                    code={shareCode}
                    playId={selected.id}
                    comments={comments}
                    onAdded={(c) =>
                      setBundle((b) =>
                        b ? { ...b, comments: [...b.comments, c] } : b,
                      )
                    }
                  />
                </div>
              </div>
            </div>
          );
        })()
      )}
    </main>
  );
}
