"use client";

import { AssignmentList } from "@/components/assignment-list";
import { PlayDiagram } from "@/components/play-diagram";
import { rpc } from "@/lib/api";
import type { Formation, Play, TeamBundle } from "@/lib/types";
import { btnGhost, btnPrimary } from "@/lib/ui";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const PER_PAGE_OPTIONS = [1, 2, 4, 6] as const;

// Literal class strings so Tailwind sees them at build time.
const SHEET_GRID: Record<number, string> = {
  1: "grid-cols-1 grid-rows-1",
  2: "grid-cols-1 grid-rows-2",
  4: "grid-cols-2 grid-rows-2",
  6: "grid-cols-2 grid-rows-3",
};

const TITLE_SIZE: Record<number, string> = {
  1: "text-xl",
  2: "text-lg",
  4: "text-sm",
  6: "text-xs",
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function PlayCell({
  play,
  offense,
  defense,
  perPage,
  showAssignments,
}: {
  play: Play;
  offense: Formation;
  defense: Formation | null;
  perPage: number;
  showAssignments: boolean;
}) {
  const sideBySide = showAssignments && perPage <= 2;
  return (
    <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded border border-gray-300 p-2">
      <h2 className={`${TITLE_SIZE[perPage]} truncate font-black leading-tight`}>
        {play.name}
        <span className="ml-2 text-xs font-normal text-gray-500">
          {offense.name}
        </span>
      </h2>
      <div className={`mt-1 flex min-h-0 flex-1 gap-3 ${sideBySide ? "" : "flex-col"}`}>
        <div className="min-h-0 min-w-0 flex-1">
          {/* w-full + h-full: the SVG letterboxes itself inside the cell */}
          <PlayDiagram
            offense={offense}
            defense={defense}
            routes={play.routes}
            className="pointer-events-none h-full rounded-none"
          />
        </div>
        {sideBySide && (
          <div className="w-[36%] min-w-0 shrink-0 overflow-hidden py-1">
            <AssignmentList offense={offense} play={play} light />
            {play.notes && (
              <p className="mt-2 whitespace-pre-wrap text-xs text-gray-700">
                <span className="font-bold">Notes: </span>
                {play.notes}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default function PrintPlaybook() {
  const { code } = useParams<{ code: string }>();
  const joinCode = decodeURIComponent(code).toUpperCase();
  const [bundle, setBundle] = useState<TeamBundle | null>(null);
  const [error, setError] = useState("");
  const [perPage, setPerPage] = useState<number>(2);
  const [showAssignments, setShowAssignments] = useState(true);

  useEffect(() => {
    rpc<TeamBundle>("getTeam", { joinCode })
      .then(setBundle)
      .catch((e) => setError(e.message));
  }, [joinCode]);

  const pickPerPage = (n: number) => {
    setPerPage(n);
    // Assignments fit beside the diagram at 1–2 per page; at 4–6 the
    // cells are card-sized, so default them off (still toggleable).
    setShowAssignments(n <= 2);
  };

  if (error) return <p className="py-16 text-center text-rose-400">{error}</p>;
  if (!bundle)
    return <p className="py-16 text-center text-neutral-400">Loading…</p>;

  const { team, formations, plays } = bundle;
  const printable = plays.filter((p) =>
    formations.some((f) => f.id === p.formationId),
  );
  const sheets = chunk(printable, perPage);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-6 print:max-w-none print:p-0">
      {/* controls — never printed */}
      <div className="mb-6 print:hidden">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link href={`/t/${joinCode}`} className={btnGhost}>
            ← Playbook
          </Link>
          <h1 className="text-lg font-black text-white">
            {team.name} — print layout
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-3">
          <span className="text-sm font-semibold text-neutral-300">
            Plays per sheet:
          </span>
          {PER_PAGE_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => pickPerPage(n)}
              className={`${btnGhost} min-w-10 ${
                perPage === n ? "ring-2 ring-amber-500" : ""
              }`}
            >
              {n}
            </button>
          ))}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={showAssignments}
              onChange={(e) => setShowAssignments(e.target.checked)}
              className="h-4 w-4 accent-amber-500"
            />
            Assignments
          </label>
          <span className="text-xs text-neutral-500">
            {printable.length} plays · {sheets.length}{" "}
            {sheets.length === 1 ? "sheet" : "sheets"}
          </span>
          <button
            className={`${btnPrimary} ml-auto`}
            onClick={() => window.print()}
          >
            🖨 Print / Save as PDF
          </button>
        </div>
      </div>

      {/* sheets — on screen: letter-proportioned white previews;
          in print: one full page each */}
      {sheets.map((sheetPlays, i) => (
        <div
          key={i}
          className="mb-6 flex aspect-[8.5/11] w-full flex-col bg-white p-4 text-gray-900 shadow-lg print:mb-0 print:aspect-auto print:h-[97vh] print:p-2 print:shadow-none"
          style={
            i < sheets.length - 1
              ? { breakAfter: "page", pageBreakAfter: "always" }
              : undefined
          }
        >
          <div className="mb-1 flex items-baseline justify-between text-[10px] text-gray-400">
            <span className="font-bold uppercase tracking-wide">
              {team.name}
            </span>
            <span>
              Sheet {i + 1}/{sheets.length}
            </span>
          </div>
          <div className={`grid min-h-0 flex-1 gap-2 ${SHEET_GRID[perPage]}`}>
            {sheetPlays.map((p) => (
              <PlayCell
                key={p.id}
                play={p}
                offense={formations.find((f) => f.id === p.formationId)!}
                defense={
                  formations.find((f) => f.id === p.defenseFormationId) ?? null
                }
                perPage={perPage}
                showAssignments={showAssignments}
              />
            ))}
          </div>
        </div>
      ))}
      {printable.length === 0 && (
        <p className="text-neutral-500">No plays yet.</p>
      )}
    </main>
  );
}
