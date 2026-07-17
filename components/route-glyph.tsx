"use client";

import { endAngle, smoothPathD, type Pt } from "@/lib/geometry";
import type { RouteEndStyle } from "@/lib/types";
import type { PointerEvent as ReactPointerEvent } from "react";

export function RouteGlyph({
  points,
  color,
  endStyle,
  dim = false,
  showHandles = false,
  onHandleDown,
}: {
  points: Pt[];
  color: string;
  endStyle: RouteEndStyle;
  dim?: boolean;
  showHandles?: boolean;
  /** Pointer-down on the handle for path point `index` (0 = first drawn point). */
  onHandleDown?: (index: number, e: ReactPointerEvent<SVGGElement>) => void;
}) {
  if (points.length < 2) return null;
  const d = smoothPathD(points);
  const [ex, ey] = points[points.length - 1];
  const deg = (endAngle(points) * 180) / Math.PI;

  return (
    <g opacity={dim ? 0.3 : 1}>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="0.42"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g transform={`translate(${ex} ${ey}) rotate(${deg})`}>
        {endStyle === "arrow" ? (
          <path d="M -0.5 -0.85 L 1.1 0 L -0.5 0.85 Z" fill={color} />
        ) : (
          <line
            x1="0.15"
            y1="-1.1"
            x2="0.15"
            y2="1.1"
            stroke={color}
            strokeWidth="0.45"
            strokeLinecap="round"
          />
        )}
      </g>
      {showHandles &&
        points.slice(1).map(([px, py], i) => (
          <g
            key={i}
            transform={`translate(${px} ${py})`}
            onPointerDown={onHandleDown ? (e) => onHandleDown(i, e) : undefined}
            className={onHandleDown ? "cursor-move" : undefined}
          >
            <circle r="0.42" fill={color} stroke="#fff" strokeWidth="0.14" />
            {onHandleDown && <circle r="1" fill="transparent" />}
          </g>
        ))}
    </g>
  );
}
