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
  const posColor = getPositionColor(label);
  const stroke = ghost ? "#6b7280" : (color ?? posColor);
  const fill = ghost ? "#27272a" : "#1c1c1c";
  const opacity = ghost ? 0.45 : 1;

  return (
    <g
      transform={`translate(${x} ${y})`}
      opacity={opacity}
      onPointerDown={onPointerDown}
      className={interactive ? "cursor-pointer" : undefined}
    >
      {selected && (
        <circle r={r + 0.55} fill="none" stroke="#facc15" strokeWidth="0.22" strokeDasharray="0.5 0.35" />
      )}
      {side === "offense" ? (
        <>
          {label === "C" ? (
            <rect
              x={-r}
              y={-r}
              width={r * 2}
              height={r * 2}
              rx="0.2"
              fill={fill}
              stroke={stroke}
              strokeWidth="0.22"
            />
          ) : (
            <circle r={r} fill={fill} stroke={stroke} strokeWidth="0.22" />
          )}
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={label.length > 2 ? 0.75 : 0.95}
            fontWeight="700"
            fill={stroke}
          >
            {label}
          </text>
        </>
      ) : (
        <>
          <g stroke={stroke} strokeWidth="0.32" strokeLinecap="round">
            <line x1={-0.85} y1={-0.85} x2={0.85} y2={0.85} />
            <line x1={-0.85} y1={0.85} x2={0.85} y2={-0.85} />
          </g>
          <text
            textAnchor="middle"
            fontSize="0.72"
            fontWeight="600"
            fill={stroke}
            y={2.15}
          >
            {label}
          </text>
        </>
      )}
      {interactive && <circle r={r + 0.6} fill="transparent" />}
    </g>
  );
}
