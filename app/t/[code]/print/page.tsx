"use client";

import { AssignmentList } from "@/components/assignment-list";
import { PlayDiagram } from "@/components/play-diagram";
import { rpc } from "@/lib/api";
import type { TeamBundle } from "@/lib/types";
import { btnGhost, btnPrimary } from "@/lib/ui";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function PrintPlaybook() {
  const { code } = useParams<{ code: string }>();
  const joinCode = decodeURIComponent(code).toUpperCase();
  const [bundle, setBundle] = useState<TeamBundle | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    rpc<TeamBundle>("getTeam", { joinCode })
      .then(setBundle)
      .catch((e) => setError(e.message));
  }, [joinCode]);

  if (error) return <p className="py-16 text-center text-rose-400">{error}</p>;
  if (!bundle)
    return <p className="py-16 text-center text-neutral-400">Loading…</p>;

  const { team, formations, plays } = bundle;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 bg-white px-6 py-6 text-gray-900 print:max-w-none">
      <div className="mb-6 flex items-center gap-3 print:hidden">
        <Link href={`/t/${joinCode}`} className={btnGhost}>
          ← Playbook
        </Link>
        <button className={btnPrimary} onClick={() => window.print()}>
          🖨 Print / Save as PDF
        </button>
      </div>

      <header className="mb-8 border-b-2 border-gray-900 pb-3">
        <h1 className="text-3xl font-black">{team.name} — Playbook</h1>
        <p className="text-sm text-gray-500">
          {plays.length} plays · printed {new Date().toLocaleDateString()}
        </p>
      </header>

      {plays.map((p) => {
        const offense = formations.find((f) => f.id === p.formationId);
        if (!offense) return null;
        return (
          <section
            key={p.id}
            className="mb-10 break-inside-avoid"
            style={{ pageBreakInside: "avoid" }}
          >
            <h2 className="mb-2 text-xl font-black">
              {p.name}
              <span className="ml-2 text-sm font-normal text-gray-500">
                {offense.name}
              </span>
            </h2>
            <PlayDiagram
              offense={offense}
              defense={
                formations.find((f) => f.id === p.defenseFormationId) ?? null
              }
              routes={p.routes}
              className="pointer-events-none mb-3 rounded-none border border-gray-300"
            />
            <AssignmentList offense={offense} play={p} light />
            {p.notes && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                <span className="font-bold">Notes: </span>
                {p.notes}
              </p>
            )}
          </section>
        );
      })}
      {plays.length === 0 && <p className="text-gray-500">No plays yet.</p>}
    </main>
  );
}
