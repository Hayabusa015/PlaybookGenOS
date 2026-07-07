"use client";

import { endAngle, smoothPathD, type Pt } from "@/lib/geometry";
import type { RouteEndStyle } from "@/lib/types";

/** A drawn route: smoothed line plus an arrowhead or block bar at the end. */
export function RouteGlyph({
  points,
  color,
  endStyle,
  dim = false,
  showHandles = false,
}: {
  points: Pt[]; // full path including the player's starting spot
  color: string;
  endStyle: RouteEndStyle;
  dim?: boolean;
  showHandles?: boolean;
}) {
  if (points.length < 2) return null;
  const d = smoothPathD(points);
  const [ex, ey] = points[points.length - 1];
  const deg = (endAngle(points) * 180) / Math.PI;

  return (
    <g opacity={dim ? 0.35 : 1}>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="0.32"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g transform={`translate(${ex} ${ey}) rotate(${deg})`}>
        {endStyle === "arrow" ? (
          <path d="M -0.4 -0.75 L 1 0 L -0.4 0.75 Z" fill={color} />
        ) : (
          <line
            x1="0.15"
            y1="-1"
            x2="0.15"
            y2="1"
            stroke={color}
            strokeWidth="0.4"
            strokeLinecap="round"
          />
        )}
      </g>
      {showHandles &&
        points.slice(1).map(([px, py], i) => (
          <circle key={i} cx={px} cy={py} r="0.32" fill={color} opacity="0.85" />
        ))}
    </g>
  );
}
