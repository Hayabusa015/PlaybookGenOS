import { getPositionColor } from "@/lib/templates";
import type { Formation, Play } from "@/lib/types";

export function AssignmentList({
  offense,
  play,
  light = false,
}: {
  offense: Formation;
  play: Play;
  light?: boolean;
}) {
  const rows = offense.players
    .map((p) => ({ player: p, route: play.routes[p.id] }))
    .filter(
      ({ route }) => route && (route.assignment || route.path.length > 0),
    );
  if (rows.length === 0)
    return (
      <p className={`text-sm ${light ? "text-gray-500" : "text-neutral-500"}`}>
        No assignments yet.
      </p>
    );
  return (
    <ul className="space-y-1.5">
      {rows.map(({ player, route }) => (
        <li key={player.id} className="flex items-baseline gap-2 text-sm">
          <span
            className="w-11 shrink-0 rounded px-1 text-center text-xs font-bold"
            style={{
              color: light ? "#fff" : "#fff",
              backgroundColor: light ? "#555" : getPositionColor(player.label),
            }}
          >
            {player.label}
          </span>
          <span className={light ? "text-gray-800" : "text-neutral-300"}>
            {route!.assignment ||
              (route!.endStyle === "block" ? "Block" : "Run route as drawn")}
          </span>
        </li>
      ))}
    </ul>
  );
}
