import { LOS_Y } from "./field-dims";
import type { Player, Side } from "./types";

export const PLAYER_COUNTS = [11, 8, 7, 5] as const;

export const COUNT_LABELS: Record<number, string> = {
  11: "11-man (varsity/JV)",
  8: "8-man",
  7: "7v7",
  5: "5v5 flag",
};

const CX = 26.7; // middle of the field

type Spot = [label: string, x: number, y: number];

export interface PersonnelPackage {
  id: string;
  label: string;
  description: string;
  spots: Spot[];
}

// OL is always 5: LT LG C RG RT. QB is always 1.
// Personnel code: first digit = RBs, second digit = TEs.
// Remaining skill players (out of 5 non-OL/QB) are WRs.
const OL: Spot[] = [
  ["LT", CX - 6, LOS_Y + 1],
  ["LG", CX - 3, LOS_Y + 1],
  ["C", CX, LOS_Y + 1],
  ["RG", CX + 3, LOS_Y + 1],
  ["RT", CX + 6, LOS_Y + 1],
];
const QB: Spot = ["QB", CX, LOS_Y + 2.8];

export const PERSONNEL_11: PersonnelPackage[] = [
  {
    id: "11",
    label: "11 Personnel",
    description: "1 RB, 1 TE, 3 WR",
    spots: [
      ...OL, QB,
      ["RB", CX, LOS_Y + 6.5],
      ["TE", CX + 9, LOS_Y + 1],
      ["X", 8, LOS_Y + 1],
      ["H", 16, LOS_Y + 2],
      ["Z", 46, LOS_Y + 1],
    ],
  },
  {
    id: "12",
    label: "12 Personnel",
    description: "1 RB, 2 TE",
    spots: [
      ...OL, QB,
      ["RB", CX, LOS_Y + 6.5],
      ["TE", CX + 9, LOS_Y + 1],
      ["TE", CX - 9, LOS_Y + 1],
      ["X", 8, LOS_Y + 1],
      ["Z", 46, LOS_Y + 1],
    ],
  },
  {
    id: "21",
    label: "21 Personnel",
    description: "2 RB, 1 TE, 2 WR",
    spots: [
      ...OL, QB,
      ["FB", CX, LOS_Y + 5.5],
      ["RB", CX, LOS_Y + 8],
      ["TE", CX + 9, LOS_Y + 1],
      ["X", 8, LOS_Y + 1],
      ["Z", 46, LOS_Y + 1],
    ],
  },
  {
    id: "22",
    label: "22 Personnel",
    description: "2 RB, 2 TE, 1 WR",
    spots: [
      ...OL, QB,
      ["FB", CX, LOS_Y + 5.5],
      ["RB", CX, LOS_Y + 8],
      ["TE", CX + 9, LOS_Y + 1],
      ["TE", CX - 9, LOS_Y + 1],
      ["X", 8, LOS_Y + 1],
    ],
  },
  {
    id: "10",
    label: "10 Personnel",
    description: "1 RB, 0 TE, 4 WR (empty)",
    spots: [
      ...OL, QB,
      ["RB", CX, LOS_Y + 6.5],
      ["X", 8, LOS_Y + 1],
      ["H", 16, LOS_Y + 2],
      ["Y", 38, LOS_Y + 2],
      ["Z", 46, LOS_Y + 1],
    ],
  },
  {
    id: "20",
    label: "20 Personnel",
    description: "2 RB, 0 TE, 3 WR",
    spots: [
      ...OL, QB,
      ["FB", CX, LOS_Y + 5.5],
      ["RB", CX, LOS_Y + 8],
      ["X", 8, LOS_Y + 1],
      ["H", 16, LOS_Y + 2],
      ["Z", 46, LOS_Y + 1],
    ],
  },
  {
    id: "13",
    label: "13 Personnel",
    description: "1 RB, 3 TE, 1 WR",
    spots: [
      ...OL, QB,
      ["RB", CX, LOS_Y + 6.5],
      ["TE", CX + 9, LOS_Y + 1],
      ["TE", CX - 9, LOS_Y + 1],
      ["TE", CX + 12, LOS_Y + 2],
      ["X", 8, LOS_Y + 1],
    ],
  },
  {
    id: "23",
    label: "23 Personnel",
    description: "2 RB, 3 TE, 0 WR (goal line)",
    spots: [
      ...OL, QB,
      ["FB", CX, LOS_Y + 5.5],
      ["RB", CX, LOS_Y + 8],
      ["TE", CX + 9, LOS_Y + 1],
      ["TE", CX - 9, LOS_Y + 1],
      ["TE", CX + 12, LOS_Y + 2],
    ],
  },
];

// Offense lines up below the LOS (larger y) and attacks upfield.
const OFFENSE: Record<number, Spot[]> = {
  11: PERSONNEL_11[0].spots, // default to 11 personnel
  8: [
    ["LE", CX - 6, LOS_Y + 1],
    ["LG", CX - 3, LOS_Y + 1],
    ["C", CX, LOS_Y + 1],
    ["RG", CX + 3, LOS_Y + 1],
    ["RE", CX + 6, LOS_Y + 1],
    ["QB", CX, LOS_Y + 2.8],
    ["RB", CX, LOS_Y + 6.5],
    ["WR", 10, LOS_Y + 2],
  ],
  7: [
    ["C", CX, LOS_Y + 1],
    ["QB", CX, LOS_Y + 5],
    ["X", 8, LOS_Y + 1],
    ["Y", 16, LOS_Y + 2],
    ["H", 37, LOS_Y + 2],
    ["Z", 46, LOS_Y + 1],
    ["RB", CX + 4.5, LOS_Y + 5.5],
  ],
  5: [
    ["C", CX, LOS_Y + 1],
    ["QB", CX, LOS_Y + 5],
    ["WR", 12, LOS_Y + 1],
    ["Z", 41, LOS_Y + 1],
    ["RB", CX + 4, LOS_Y + 5.5],
  ],
};

// Defense lines up above the LOS (smaller y).
const DEFENSE: Record<number, Spot[]> = {
  11: [
    ["DE", CX - 7.2, LOS_Y - 1.5],
    ["DT", CX - 2.7, LOS_Y - 1.5],
    ["DT", CX + 2.7, LOS_Y - 1.5],
    ["DE", CX + 7.2, LOS_Y - 1.5],
    ["W", CX - 5.7, LOS_Y - 4.5],
    ["M", CX, LOS_Y - 4.5],
    ["S", CX + 5.7, LOS_Y - 4.5],
    ["CB", 8, LOS_Y - 2.5],
    ["CB", 45.5, LOS_Y - 2.5],
    ["FS", CX - 4.7, LOS_Y - 11],
    ["SS", CX + 5.3, LOS_Y - 9.5],
  ],
  8: [
    ["DE", CX - 5.7, LOS_Y - 1.5],
    ["NT", CX, LOS_Y - 1.5],
    ["DE", CX + 5.7, LOS_Y - 1.5],
    ["LB", CX - 5.2, LOS_Y - 4.5],
    ["MLB", CX, LOS_Y - 4.5],
    ["LB", CX + 5.2, LOS_Y - 4.5],
    ["S", CX - 8.7, LOS_Y - 10],
    ["S", CX + 8.3, LOS_Y - 10],
  ],
  7: [
    ["DE", CX - 5.7, LOS_Y - 1.5],
    ["NT", CX, LOS_Y - 1.5],
    ["DE", CX + 5.7, LOS_Y - 1.5],
    ["LB", CX - 3.7, LOS_Y - 4.5],
    ["LB", CX + 3.7, LOS_Y - 4.5],
    ["DB", 13, LOS_Y - 7],
    ["DB", 40.5, LOS_Y - 7],
  ],
  5: [
    ["R", CX, LOS_Y - 1.5],
    ["LB", CX - 5.7, LOS_Y - 4],
    ["LB", CX + 5.7, LOS_Y - 4],
    ["DB", 15, LOS_Y - 8.5],
    ["DB", 38.5, LOS_Y - 8.5],
  ],
};

export function templatePlayers(side: Side, count: number, personnelId?: string): Player[] {
  let spots: Spot[];
  if (side === "offense" && count === 11 && personnelId) {
    const pkg = PERSONNEL_11.find((p) => p.id === personnelId);
    spots = pkg?.spots ?? OFFENSE[count] ?? [];
  } else {
    spots = (side === "offense" ? OFFENSE : DEFENSE)[count] ?? [];
  }
  return spots.map(([label, x, y]) => ({
    id: crypto.randomUUID(),
    label,
    x,
    y,
  }));
}

export const ROUTE_COLORS = [
  "#facc15", // yellow
  "#f87171", // red
  "#60a5fa", // blue
  "#4ade80", // green
  "#e879f9", // magenta
  "#fb923c", // orange
];

export type PositionGroup = "ol" | "qb" | "rb" | "wr" | "dl" | "lb" | "db";

const POSITION_GROUP_MAP: Record<string, PositionGroup> = {
  LT: "ol", LG: "ol", C: "ol", RG: "ol", RT: "ol", LE: "ol", RE: "ol", TE: "wr",
  QB: "qb",
  RB: "rb", FB: "rb", HB: "rb",
  WR: "wr", X: "wr", Z: "wr", Y: "wr", H: "wr", SE: "wr", FL: "wr",
  DE: "dl", DT: "dl", NT: "dl", R: "dl", NG: "dl",
  LB: "lb", MLB: "lb", ILB: "lb", OLB: "lb", W: "lb", M: "lb", S: "lb", SAM: "lb", WILL: "lb", MIKE: "lb",
  CB: "db", FS: "db", SS: "db", DB: "db", NB: "db",
};

export const POSITION_COLORS: Record<PositionGroup, string> = {
  ol: "#3b82f6",  // blue — offensive linemen
  qb: "#f97316",  // orange — QB standout
  rb: "#dc2626",  // red — running backs
  wr: "#22c55e",  // green — receivers & TE
  dl: "#dc2626",  // red — defensive linemen
  lb: "#f97316",  // orange — linebackers
  db: "#22c55e",  // green — defensive backs
};

export function getPositionColor(label: string): string {
  const group = POSITION_GROUP_MAP[label.toUpperCase()];
  return group ? POSITION_COLORS[group] : "#e5e5e5";
}
