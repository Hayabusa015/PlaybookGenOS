"use client";

import { POSITION_COLORS, ROUTE_COLORS } from "@/lib/templates";
import type { ReactNode } from "react";

/** Route color choice: a fixed color, or "auto" = the player's position color. */
export type RouteColorChoice = string;
export const AUTO_COLOR = "auto";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const RouteIcon = () => (
  <Icon>
    <path d="M4 16 L14 6" />
    <path d="M9 5.5 H14.5 V11" />
  </Icon>
);
const BlockIcon = () => (
  <Icon>
    <path d="M10 16 V6.5" />
    <path d="M5 5.5 H15" />
  </Icon>
);
const UndoIcon = () => (
  <Icon>
    <path d="M7.5 4.5 L4 8 l3.5 3.5" />
    <path d="M4 8 h8 a4 4 0 0 1 0 8 h-3" />
  </Icon>
);
const ClearIcon = () => (
  <Icon>
    <path d="M5.5 5.5 l9 9 M14.5 5.5 l-9 9" />
  </Icon>
);
const DoneIcon = () => (
  <Icon>
    <path d="M4.5 10.5 l4 4 L15.5 6" />
  </Icon>
);
const PlayIcon = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
    <path d="M6.5 4.5 L15.5 10 L6.5 15.5 Z" />
  </svg>
);
const StopIcon = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
    <rect x="5.5" y="5.5" width="9" height="9" rx="1" />
  </svg>
);
const ResetIcon = () => (
  <Icon>
    <path d="M4.5 8 a6 6 0 1 1 -0.8 4.5" />
    <path d="M4.5 3.5 V8 H9" />
  </Icon>
);

function RailButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
        active
          ? "bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/50"
          : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
      } ${disabled ? "cursor-default opacity-35 hover:bg-transparent hover:text-neutral-400" : ""}`}
    >
      {children}
    </button>
  );
}

const Divider = () => (
  <div className="h-6 w-px shrink-0 bg-neutral-800 sm:h-px sm:w-6" />
);

const autoSwatchBg = `conic-gradient(${POSITION_COLORS.ol}, ${POSITION_COLORS.qb}, ${POSITION_COLORS.rb}, ${POSITION_COLORS.wr}, ${POSITION_COLORS.ol})`;

export function ToolRail({
  tool,
  onTool,
  color,
  onColor,
  hasSelection,
  routeLength,
  onUndo,
  onClear,
  onDone,
  playing,
  progress,
  onRun,
  onReset,
}: {
  tool: "route" | "block";
  onTool: (t: "route" | "block") => void;
  color: RouteColorChoice;
  onColor: (c: RouteColorChoice) => void;
  hasSelection: boolean;
  routeLength: number;
  onUndo: () => void;
  onClear: () => void;
  onDone: () => void;
  playing: boolean;
  progress: number;
  onRun: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex h-fit w-fit flex-row flex-wrap items-center gap-1 rounded-xl border border-neutral-800 bg-neutral-900 p-1.5 shadow-lg sm:sticky sm:top-3 sm:flex-col">
      <RailButton
        label="Route tool"
        active={tool === "route"}
        onClick={() => onTool("route")}
      >
        <RouteIcon />
      </RailButton>
      <RailButton
        label="Block tool"
        active={tool === "block"}
        onClick={() => onTool("block")}
      >
        <BlockIcon />
      </RailButton>

      <Divider />

      <button
        aria-label="route color auto"
        title="Auto — use the player's position color"
        onClick={() => onColor(AUTO_COLOR)}
        className={`m-1 h-6 w-6 shrink-0 rounded-full transition-transform ${
          color === AUTO_COLOR
            ? "scale-110 ring-2 ring-white"
            : "ring-1 ring-neutral-700 hover:scale-110"
        }`}
        style={{ background: autoSwatchBg }}
      />
      {ROUTE_COLORS.map((c) => (
        <button
          key={c}
          aria-label={`route color ${c}`}
          title="Route color"
          onClick={() => onColor(c)}
          className={`m-1 h-6 w-6 shrink-0 rounded-full transition-transform ${
            color === c
              ? "scale-110 ring-2 ring-white"
              : "ring-1 ring-black/30 hover:scale-110"
          }`}
          style={{ backgroundColor: c }}
        />
      ))}

      <Divider />

      <RailButton
        label="Undo point"
        disabled={!hasSelection || routeLength === 0}
        onClick={onUndo}
      >
        <UndoIcon />
      </RailButton>
      <RailButton
        label="Clear route"
        disabled={!hasSelection || routeLength === 0}
        onClick={onClear}
      >
        <ClearIcon />
      </RailButton>
      <RailButton label="Done" disabled={!hasSelection} onClick={onDone}>
        <DoneIcon />
      </RailButton>

      <Divider />

      <RailButton label={playing ? "Stop" : "Run play"} onClick={onRun}>
        {playing ? <StopIcon /> : <PlayIcon />}
      </RailButton>
      {progress > 0 && !playing && (
        <RailButton label="Reset animation" onClick={onReset}>
          <ResetIcon />
        </RailButton>
      )}
    </div>
  );
}
