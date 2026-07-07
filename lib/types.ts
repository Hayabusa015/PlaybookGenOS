export type Side = "offense" | "defense";

export interface Player {
  id: string;
  label: string;
  x: number; // yards, 0..53.33 across the field
  y: number; // yards, 0..40 down the visible field (LOS at y=24)
}

export interface Formation {
  id: string;
  teamId: string;
  name: string;
  side: Side;
  playerCount: number;
  players: Player[];
  createdAt: string;
}

export type RouteEndStyle = "arrow" | "block";

export interface PlayerRoute {
  // Waypoints AFTER the player's starting spot; the route always begins at
  // the player's current formation position, so moving a player keeps
  // routes attached.
  path: [number, number][];
  endStyle: RouteEndStyle;
  color: string;
  assignment: string;
}

export interface Play {
  id: string;
  teamId: string;
  formationId: string;
  defenseFormationId: string | null;
  name: string;
  routes: Record<string, PlayerRoute>;
  notes: string;
  createdBy: string;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  joinCode: string;
  shareCode: string;
  createdAt: string;
}

export interface PlayComment {
  id: string;
  playId: string;
  coachName: string;
  body: string;
  createdAt: string;
}

export interface TeamBundle {
  team: Team;
  formations: Formation[];
  plays: Play[];
  comments: PlayComment[];
}

/** Shape of an exported/imported playbook file. */
export interface PlaybookFile {
  app: "playbookgenos";
  version: 1;
  teamName: string;
  exportedAt: string;
  formations: Formation[];
  plays: Play[];
}
