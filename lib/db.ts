import { neon } from "@neondatabase/serverless";
import type { Formation, Play, PlayComment, Team } from "./types";

export interface PlaybookDB {
  createTeam(name: string, joinCode: string, shareCode: string): Promise<Team>;
  teamByJoinCode(joinCode: string): Promise<Team | null>;
  teamByShareCode(shareCode: string): Promise<Team | null>;
  bundle(teamId: string): Promise<{
    formations: Formation[];
    plays: Play[];
    comments: PlayComment[];
  }>;
  saveFormation(f: Formation): Promise<void>;
  deleteFormation(teamId: string, id: string): Promise<void>;
  savePlay(p: Play): Promise<void>;
  deletePlay(teamId: string, id: string): Promise<void>;
  addComment(c: PlayComment): Promise<void>;
}

/* ------------------------------------------------------------------ */
/* Neon (production)                                                   */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

function rowToTeam(r: Row): Team {
  return {
    id: r.id as string,
    name: r.name as string,
    joinCode: r.join_code as string,
    shareCode: r.share_code as string,
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

function rowToFormation(r: Row): Formation {
  return {
    id: r.id as string,
    teamId: r.team_id as string,
    name: r.name as string,
    side: r.side as Formation["side"],
    playerCount: r.player_count as number,
    players: r.players as Formation["players"],
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

function rowToPlay(r: Row): Play {
  return {
    id: r.id as string,
    teamId: r.team_id as string,
    formationId: r.formation_id as string,
    defenseFormationId: (r.defense_formation_id as string | null) ?? null,
    name: r.name as string,
    routes: r.routes as Play["routes"],
    notes: r.notes as string,
    createdBy: r.created_by as string,
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

function rowToComment(r: Row): PlayComment {
  return {
    id: r.id as string,
    playId: r.play_id as string,
    coachName: r.coach_name as string,
    body: r.body as string,
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

function neonDB(url: string): PlaybookDB {
  const sql = neon(url);
  return {
    async createTeam(name, joinCode, shareCode) {
      const rows = await sql`
        insert into teams (name, join_code, share_code)
        values (${name}, ${joinCode}, ${shareCode})
        returning *`;
      return rowToTeam(rows[0]);
    },
    async teamByJoinCode(joinCode) {
      const rows = await sql`select * from teams where join_code = ${joinCode}`;
      return rows[0] ? rowToTeam(rows[0]) : null;
    },
    async teamByShareCode(shareCode) {
      const rows = await sql`select * from teams where share_code = ${shareCode}`;
      return rows[0] ? rowToTeam(rows[0]) : null;
    },
    async bundle(teamId) {
      const [formations, plays, comments] = await Promise.all([
        sql`select * from formations where team_id = ${teamId} order by created_at`,
        sql`select * from plays where team_id = ${teamId} order by created_at`,
        sql`select c.* from comments c
            join plays p on p.id = c.play_id
            where p.team_id = ${teamId} order by c.created_at`,
      ]);
      return {
        formations: formations.map(rowToFormation),
        plays: plays.map(rowToPlay),
        comments: comments.map(rowToComment),
      };
    },
    async saveFormation(f) {
      await sql`
        insert into formations (id, team_id, name, side, player_count, players, created_at)
        values (${f.id}, ${f.teamId}, ${f.name}, ${f.side}, ${f.playerCount},
                ${JSON.stringify(f.players)}::jsonb, ${f.createdAt})
        on conflict (id) do update set
          name = excluded.name,
          player_count = excluded.player_count,
          players = excluded.players
        where formations.team_id = excluded.team_id`;
    },
    async deleteFormation(teamId, id) {
      await sql`delete from formations where id = ${id} and team_id = ${teamId}`;
    },
    async savePlay(p) {
      await sql`
        insert into plays (id, team_id, formation_id, defense_formation_id, name,
                           routes, notes, created_by, created_at)
        values (${p.id}, ${p.teamId}, ${p.formationId}, ${p.defenseFormationId},
                ${p.name}, ${JSON.stringify(p.routes)}::jsonb, ${p.notes},
                ${p.createdBy}, ${p.createdAt})
        on conflict (id) do update set
          formation_id = excluded.formation_id,
          defense_formation_id = excluded.defense_formation_id,
          name = excluded.name,
          routes = excluded.routes,
          notes = excluded.notes
        where plays.team_id = excluded.team_id`;
    },
    async deletePlay(teamId, id) {
      await sql`delete from plays where id = ${id} and team_id = ${teamId}`;
    },
    async addComment(c) {
      await sql`
        insert into comments (id, play_id, coach_name, body, created_at)
        values (${c.id}, ${c.playId}, ${c.coachName}, ${c.body}, ${c.createdAt})`;
    },
  };
}

/* ------------------------------------------------------------------ */
/* In-memory fallback (local development without DATABASE_URL)         */
/* ------------------------------------------------------------------ */

interface MemStore {
  teams: Team[];
  formations: Formation[];
  plays: Play[];
  comments: PlayComment[];
}

function memDB(): PlaybookDB {
  const g = globalThis as unknown as { __playbookMem?: MemStore };
  g.__playbookMem ??= { teams: [], formations: [], plays: [], comments: [] };
  const s = g.__playbookMem;

  const deletePlays = (ids: Set<string>) => {
    s.comments = s.comments.filter((c) => !ids.has(c.playId));
    s.plays = s.plays.filter((p) => !ids.has(p.id));
  };

  return {
    async createTeam(name, joinCode, shareCode) {
      const team: Team = {
        id: crypto.randomUUID(),
        name,
        joinCode,
        shareCode,
        createdAt: new Date().toISOString(),
      };
      s.teams.push(team);
      return team;
    },
    async teamByJoinCode(joinCode) {
      return s.teams.find((t) => t.joinCode === joinCode) ?? null;
    },
    async teamByShareCode(shareCode) {
      return s.teams.find((t) => t.shareCode === shareCode) ?? null;
    },
    async bundle(teamId) {
      const plays = s.plays.filter((p) => p.teamId === teamId);
      const playIds = new Set(plays.map((p) => p.id));
      return {
        formations: s.formations.filter((f) => f.teamId === teamId),
        plays,
        comments: s.comments.filter((c) => playIds.has(c.playId)),
      };
    },
    async saveFormation(f) {
      const i = s.formations.findIndex(
        (x) => x.id === f.id && x.teamId === f.teamId,
      );
      if (i >= 0) s.formations[i] = f;
      else s.formations.push(f);
    },
    async deleteFormation(teamId, id) {
      s.formations = s.formations.filter(
        (f) => !(f.id === id && f.teamId === teamId),
      );
      // Cascade like the SQL schema: plays referencing the formation go too.
      deletePlays(
        new Set(
          s.plays
            .filter((p) => p.teamId === teamId && p.formationId === id)
            .map((p) => p.id),
        ),
      );
      s.plays = s.plays.map((p) =>
        p.defenseFormationId === id ? { ...p, defenseFormationId: null } : p,
      );
    },
    async savePlay(p) {
      const i = s.plays.findIndex((x) => x.id === p.id && x.teamId === p.teamId);
      if (i >= 0) s.plays[i] = p;
      else s.plays.push(p);
    },
    async deletePlay(teamId, id) {
      deletePlays(
        new Set(
          s.plays
            .filter((p) => p.teamId === teamId && p.id === id)
            .map((p) => p.id),
        ),
      );
    },
    async addComment(c) {
      s.comments.push(c);
    },
  };
}

export function getDB(): PlaybookDB {
  const url = process.env.DATABASE_URL;
  return url ? neonDB(url) : memDB();
}
