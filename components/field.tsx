"use client";

import { FIELD_H, FIELD_W, LOS_Y, clamp } from "@/lib/field-dims";
import type { Pt } from "@/lib/geometry";
import type { PointerEvent as ReactPointerEvent, ReactNode, RefObject } from "react";

/** Convert a pointer event's client coords into field yards. */
export function fieldPoint(
  svg: SVGSVGElement,
  e: { clientX: number; clientY: number },
): Pt {
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return [0, 0];
  const p = pt.matrixTransform(ctm.inverse());
  return [clamp(p.x, 0.6, FIELD_W - 0.6), clamp(p.y, 0.6, FIELD_H - 0.6)];
}

const YARD_LINES = [4, 9, 14, 19, 29, 34, 39];
// High-school hash marks sit 17.78 yd in from each sideline.
const HASH_X = [17.78, FIELD_W - 17.78];

export function Field({
  svgRef,
  onFieldPointerDown,
  children,
  className = "",
}: {
  svgRef?: RefObject<SVGSVGElement | null>;
  onFieldPointerDown?: (p: Pt, e: ReactPointerEvent<SVGSVGElement>) => void;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${FIELD_W} ${FIELD_H}`}
      className={`block w-full touch-none select-none rounded-xl ${className}`}
      onPointerDown={
        onFieldPointerDown
          ? (e) => onFieldPointerDown(fieldPoint(e.currentTarget, e), e)
          : undefined
      }
    >
      <rect x="0" y="0" width={FIELD_W} height={FIELD_H} fill="#14532d" />
      {/* alternating 5-yard mow stripes */}
      {[0, 2, 4, 6].map((i) => (
        <rect
          key={i}
          x="0"
          y={4 + i * 5}
          width={FIELD_W}
          height="5"
          fill="#166534"
          opacity="0.55"
        />
      ))}
      {YARD_LINES.map((y) => (
        <line
          key={y}
          x1="0.4"
          x2={FIELD_W - 0.4}
          y1={y}
          y2={y}
          stroke="#f0fdf4"
          strokeWidth="0.14"
          opacity="0.5"
        />
      ))}
      {/* hash marks every yard */}
      {HASH_X.map((hx) => (
        <g key={hx} stroke="#f0fdf4" strokeWidth="0.1" opacity="0.4">
          {Array.from({ length: FIELD_H - 1 }, (_, i) => i + 1).map((y) => (
            <line key={y} x1={hx - 0.4} x2={hx + 0.4} y1={y} y2={y} />
          ))}
        </g>
      ))}
      {/* line of scrimmage */}
      <line
        x1="0.4"
        x2={FIELD_W - 0.4}
        y1={LOS_Y}
        y2={LOS_Y}
        stroke="#93c5fd"
        strokeWidth="0.22"
        opacity="0.9"
      />
      {/* sidelines */}
      <rect
        x="0.2"
        y="0.2"
        width={FIELD_W - 0.4}
        height={FIELD_H - 0.4}
        fill="none"
        stroke="#f0fdf4"
        strokeWidth="0.3"
        opacity="0.85"
      />
      {children}
    </svg>
  );
}
