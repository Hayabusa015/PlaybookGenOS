import type { Formation, Play } from "@/lib/types";

/** Read-only assignment table for a play (share viewer + print). */
export function AssignmentList({
  offense,
  play,
  light = false,
}: {
  offense: Formation;
  play: Play;
  light?: boolean; // print-friendly colors
}) {
  const rows = offense.players
    .map((p) => ({ player: p, route: play.routes[p.id] }))
    .filter(
      ({ route }) => route && (route.assignment || route.path.length > 0),
    );
  if (rows.length === 0)
    return (
      <p className={`text-sm ${light ? "text-gray-500" : "text-slate-500"}`}>
        No assignments yet.
      </p>
    );
  return (
    <ul className="space-y-1.5">
      {rows.map(({ player, route }) => (
        <li key={player.id} className="flex items-baseline gap-2 text-sm">
          <span
            className="w-11 shrink-0 rounded px-1 text-center font-bold"
            style={{
              color: light ? "#111" : (route!.color ?? "#fff"),
              backgroundColor: light ? "#eee" : "rgb(30 41 59)",
            }}
          >
            {player.label}
          </span>
          <span className={light ? "text-gray-800" : "text-slate-300"}>
            {route!.assignment ||
              (route!.endStyle === "block" ? "Block" : "Run route as drawn")}
          </span>
        </li>
      ))}
    </ul>
  );
}
