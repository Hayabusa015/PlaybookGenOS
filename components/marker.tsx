"use client";

import { getPositionColor } from "@/lib/templates";
import type { Side } from "@/lib/types";
import type { PointerEvent as ReactPointerEvent } from "react";

export function Marker({
  x,
  y,
  label,
  side,
  ghost = false,
  selected = false,
  color,
  onPointerDown,
}: {
  x: number;
  y: number;
  label: string;
  side: Side;
  ghost?: boolean;
  selected?: boolean;
  color?: string;
  onPointerDown?: (e: ReactPointerEvent<SVGGElement>) => void;
}) {
  const r = 1.25;
  const interactive = Boolean(onPointerDown);
  const posColor = color ?? getPositionColor(label);
  const opacity = ghost ? 0.5 : 1;

  return (
    <g
      transform={`translate(${x} ${y})`}
      opacity={opacity}
      onPointerDown={onPointerDown}
      className={interactive ? "cursor-pointer" : undefined}
    >
      {selected && (
        <circle r={r + 0.6} fill="none" stroke="#facc15" strokeWidth="0.28" strokeDasharray="0.5 0.35" />
      )}
      {side === "offense" ? (
        <>
          {label === "C" ? (
            <rect
              x={-r}
              y={-r}
              width={r * 2}
              height={r * 2}
              rx="0.25"
              fill={ghost ? "#888" : posColor}
              stroke={ghost ? "#999" : "#fff"}
              strokeWidth="0.15"
            />
          ) : (
            <circle
              r={r}
              fill={ghost ? "#888" : posColor}
              stroke={ghost ? "#999" : "#fff"}
              strokeWidth="0.15"
            />
          )}
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={label.length > 2 ? 0.72 : 0.9}
            fontWeight="800"
            fill="#fff"
          >
            {label}
          </text>
        </>
      ) : (
        <>
          <circle
            r={r * 0.85}
            fill={ghost ? "#888" : posColor}
            stroke={ghost ? "#999" : "#fff"}
            strokeWidth="0.15"
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={label.length > 2 ? 0.6 : 0.75}
            fontWeight="800"
            fill="#fff"
          >
            {label}
          </text>
        </>
      )}
      {interactive && <circle r={r + 0.6} fill="transparent" />}
    </g>
  );
}
