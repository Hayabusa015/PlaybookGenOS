"use client";

import { Field } from "./field";
import { Marker } from "./marker";
import { RouteGlyph } from "./route-glyph";
import { getPositionColor } from "@/lib/templates";
import { pathLength, pointAt, type Pt } from "@/lib/geometry";
import type { Formation, Play } from "@/lib/types";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

/** Where every offensive player is at animation progress t (0..1). */
export function playerPositions(
  offense: Formation,
  routes: Play["routes"],
  progress: number,
): Map<string, Pt> {
  const out = new Map<string, Pt>();
  for (const p of offense.players) {
    const route = routes[p.id];
    if (progress > 0 && route && route.path.length > 0) {
      const full: Pt[] = [[p.x, p.y], ...route.path];
      out.set(p.id, pointAt(full, pathLength(full) * progress));
    } else {
      out.set(p.id, [p.x, p.y]);
    }
  }
  return out;
}

export function usePlayAnimation(durationMs = 2600) {
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    setPlaying(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setProgress(0);
  }, [stop]);

  const run = useCallback(() => {
    cancelAnimationFrame(raf.current);
    setPlaying(true);
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / durationMs);
      setProgress(t);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf.current = requestAnimationFrame(tick);
  }, [durationMs]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return { progress, playing, run, reset };
}

export function PlayDiagram({
  offense,
  defense,
  routes,
  progress = 0,
  selectedId,
  showHandles = false,
  onMarkerDown,
  onFieldPointerDown,
  onHandleDown,
  svgRef,
  className,
}: {
  offense: Formation;
  defense?: Formation | null;
  routes: Play["routes"];
  progress?: number;
  selectedId?: string | null;
  showHandles?: boolean;
  onMarkerDown?: (playerId: string, e: ReactPointerEvent<SVGGElement>) => void;
  onFieldPointerDown?: (p: Pt, e: ReactPointerEvent<SVGSVGElement>) => void;
  onHandleDown?: (
    playerId: string,
    pointIndex: number,
    e: ReactPointerEvent<SVGGElement>,
  ) => void;
  svgRef?: RefObject<SVGSVGElement | null>;
  className?: string;
}) {
  const positions = playerPositions(offense, routes, progress);

  return (
    <Field svgRef={svgRef} onFieldPointerDown={onFieldPointerDown} className={className}>
      {defense?.players.map((p) => (
        <Marker key={p.id} x={p.x} y={p.y} label={p.label} side="defense" ghost />
      ))}
      {offense.players.map((p) => {
        const route = routes[p.id];
        if (!route || route.path.length === 0) return null;
        const routeColor = route.color ?? getPositionColor(p.label);
        return (
          <RouteGlyph
            key={p.id}
            points={[[p.x, p.y], ...route.path]}
            color={routeColor}
            endStyle={route.endStyle}
            dim={progress > 0}
            showHandles={showHandles && p.id === selectedId}
            onHandleDown={
              onHandleDown ? (i, e) => onHandleDown(p.id, i, e) : undefined
            }
          />
        );
      })}
      {offense.players.map((p) => {
        const [x, y] = positions.get(p.id) ?? [p.x, p.y];
        return (
          <Marker
            key={p.id}
            x={x}
            y={y}
            label={p.label}
            side="offense"
            selected={p.id === selectedId}
            onPointerDown={onMarkerDown ? (e) => onMarkerDown(p.id, e) : undefined}
          />
        );
      })}
    </Field>
  );
}

export function AnimatedPlay({
  offense,
  defense,
  routes,
  className,
}: {
  offense: Formation;
  defense?: Formation | null;
  routes: Play["routes"];
  className?: string;
}) {
  const anim = usePlayAnimation();
  return (
    <div className="relative">
      <PlayDiagram
        offense={offense}
        defense={defense}
        routes={routes}
        progress={anim.progress}
        className={className}
      />
      <div className="absolute bottom-2 right-2 flex gap-2">
        <button
          onClick={anim.playing ? anim.reset : anim.run}
          className="rounded-lg bg-neutral-900/80 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur hover:bg-neutral-800"
        >
          {anim.playing ? "■ Stop" : "▶ Run play"}
        </button>
        {anim.progress > 0 && !anim.playing && (
          <button
            onClick={anim.reset}
            className="rounded-lg bg-neutral-900/80 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur hover:bg-neutral-800"
          >
            ↺ Reset
          </button>
        )}
      </div>
    </div>
  );
}
