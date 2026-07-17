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
      {/* light paper-style field background */}
      <rect x="0" y="0" width={FIELD_W} height={FIELD_H} fill="#e8e8e8" />
      {/* subtle alternating 5-yard stripes */}
      {[0, 2, 4, 6].map((i) => (
        <rect
          key={i}
          x="0"
          y={4 + i * 5}
          width={FIELD_W}
          height="5"
          fill="#dcdcdc"
          opacity="0.6"
        />
      ))}
      {/* yard lines */}
      {YARD_LINES.map((y) => (
        <line
          key={y}
          x1="0.4"
          x2={FIELD_W - 0.4}
          y1={y}
          y2={y}
          stroke="#b0b0b0"
          strokeWidth="0.14"
          opacity="0.7"
        />
      ))}
      {/* hash marks */}
      {HASH_X.map((hx) => (
        <g key={hx} stroke="#b0b0b0" strokeWidth="0.1" opacity="0.5">
          {Array.from({ length: FIELD_H - 1 }, (_, i) => i + 1).map((y) => (
            <line key={y} x1={hx - 0.4} x2={hx + 0.4} y1={y} y2={y} />
          ))}
        </g>
      ))}
      {/* yard numbers, measured from the line of scrimmage */}
      {[
        [14, "10"],
        [4, "20"],
        [34, "10"],
      ].map(([y, n]) => (
        <g
          key={y}
          fill="#a8a8a8"
          fontSize="1.7"
          fontWeight="700"
          opacity="0.8"
          style={{ fontFamily: "inherit" }}
        >
          <text x="3.4" y={y as number} dominantBaseline="central" textAnchor="middle">
            {n}
          </text>
          <text
            x={FIELD_W - 3.4}
            y={y as number}
            dominantBaseline="central"
            textAnchor="middle"
          >
            {n}
          </text>
        </g>
      ))}
      {/* line of scrimmage */}
      <line
        x1="0.4"
        x2={FIELD_W - 0.4}
        y1={LOS_Y}
        y2={LOS_Y}
        stroke="#3b82f6"
        strokeWidth="0.24"
        opacity="0.7"
      />
      {/* ball at the snap point */}
      <g transform={`translate(${FIELD_W / 2} ${LOS_Y})`}>
        <ellipse rx="0.62" ry="0.4" fill="#8b5e34" stroke="#6f4a26" strokeWidth="0.08" />
        <line x1="-0.28" x2="0.28" y1="0" y2="0" stroke="#f5f0e8" strokeWidth="0.09" />
        {[-0.16, 0, 0.16].map((lx) => (
          <line key={lx} x1={lx} x2={lx} y1="-0.11" y2="0.11" stroke="#f5f0e8" strokeWidth="0.07" />
        ))}
      </g>
      {/* sideline border */}
      <rect
        x="0.2"
        y="0.2"
        width={FIELD_W - 0.4}
        height={FIELD_H - 0.4}
        fill="none"
        stroke="#999"
        strokeWidth="0.3"
        opacity="0.6"
      />
      {children}
    </svg>
  );
}
