import { getDB } from "@/lib/db";
import type {
  Formation,
  Play,
  PlayComment,
  PlaybookFile,
  Side,
  Team,
} from "@/lib/types";

/**
 * The app's single serverless function. Every data operation is a
 * POST /api/rpc with { action, payload }.
 */

class RpcError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L

function randomCode(len: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}

function joinCodeFor(teamName: string): string {
  const base =
    teamName
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 8) || "TEAM";
  return `${base}-${randomCode(3)}`;
}

const str = (v: unknown, max: number, fallback = ""): string =>
  typeof v === "string" ? v.trim().slice(0, max) : fallback;

const isFinitePair = (p: unknown): p is [number, number] =>
  Array.isArray(p) &&
  p.length === 2 &&
  Number.isFinite(p[0]) &&
  Number.isFinite(p[1]);

function requireUUID(v: unknown, what: string): string {
  if (typeof v !== "string" || !/^[0-9a-f-]{36}$/i.test(v))
    throw new RpcError(`Invalid ${what}`);
  return v;
}

function sanitizeFormation(raw: unknown, teamId: string): Formation {
  const f = (raw ?? {}) as Record<string, unknown>;
  const side: Side = f.side === "defense" ? "defense" : "offense";
  const players = (Array.isArray(f.players) ? f.players : [])
    .slice(0, 15)
    .map((p) => {
      const pl = (p ?? {}) as Record<string, unknown>;
      if (!Number.isFinite(pl.x) || !Number.isFinite(pl.y))
        throw new RpcError("Invalid player position");
      return {
        id: str(pl.id, 40) || crypto.randomUUID(),
        label: str(pl.label, 4, "?"),
        x: pl.x as number,
        y: pl.y as number,
      };
    });
  return {
    id: requireUUID(f.id, "formation id"),
    teamId,
    name: str(f.name, 60) || "Untitled formation",
    side,
    playerCount: players.length,
    players,
    createdAt:
      typeof f.createdAt === "string" ? f.createdAt : new Date().toISOString(),
  };
}

function sanitizePlay(raw: unknown, teamId: string): Play {
  const p = (raw ?? {}) as Record<string, unknown>;
  const routes: Play["routes"] = {};
  const rawRoutes = (p.routes ?? {}) as Record<string, unknown>;
  for (const [playerId, r] of Object.entries(rawRoutes).slice(0, 15)) {
    const rt = (r ?? {}) as Record<string, unknown>;
    const path = (Array.isArray(rt.path) ? rt.path : [])
      .slice(0, 100)
      .filter(isFinitePair)
      .map((pt) => [pt[0], pt[1]] as [number, number]);
    routes[str(playerId, 40)] = {
      path,
      endStyle: rt.endStyle === "block" ? "block" : "arrow",
      color: /^#[0-9a-fA-F]{6}$/.test(rt.color as string)
        ? (rt.color as string)
        : "#facc15",
      assignment: str(rt.assignment, 200),
    };
  }
  return {
    id: requireUUID(p.id, "play id"),
    teamId,
    formationId: requireUUID(p.formationId, "formation id"),
    defenseFormationId: p.defenseFormationId
      ? requireUUID(p.defenseFormationId, "defense formation id")
      : null,
    name: str(p.name, 60) || "Untitled play",
    routes,
    notes: str(p.notes, 1000),
    createdBy: str(p.createdBy, 40),
    createdAt:
      typeof p.createdAt === "string" ? p.createdAt : new Date().toISOString(),
  };
}

async function requireTeamByJoin(joinCode: unknown): Promise<Team> {
  const db = getDB();
  const team = await db.teamByJoinCode(str(joinCode, 20).toUpperCase());
  if (!team) throw new RpcError("Team not found — check the join code", 404);
  return team;
}

type Payload = Record<string, unknown>;

async function handle(action: string, payload: Payload): Promise<unknown> {
  const db = getDB();

  switch (action) {
    case "createTeam": {
      const name = str(payload.name, 60);
      if (!name) throw new RpcError("Team name is required");
      // Retry on the (unlikely) chance of a code collision.
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          return await db.createTeam(name, joinCodeFor(name), randomCode(8));
        } catch (e) {
          if (attempt === 3) throw e;
        }
      }
      throw new RpcError("Could not create team", 500);
    }

    case "getTeam": {
      const team = await requireTeamByJoin(payload.joinCode);
      return { team, ...(await db.bundle(team.id)) };
    }

    case "getShared": {
      const team = await db.teamByShareCode(str(payload.shareCode, 20).toUpperCase());
      if (!team) throw new RpcError("Playbook not found — check the share code", 404);
      const bundle = await db.bundle(team.id);
      // Read-only view: never leak the coach join code.
      return {
        team: { id: team.id, name: team.name, shareCode: team.shareCode },
        ...bundle,
      };
    }

    case "saveFormation": {
      const team = await requireTeamByJoin(payload.joinCode);
      const formation = sanitizeFormation(payload.formation, team.id);
      await db.saveFormation(formation);
      return { formation };
    }

    case "deleteFormation": {
      const team = await requireTeamByJoin(payload.joinCode);
      await db.deleteFormation(team.id, requireUUID(payload.id, "formation id"));
      return {};
    }

    case "savePlay": {
      const team = await requireTeamByJoin(payload.joinCode);
      const play = sanitizePlay(payload.play, team.id);
      await db.savePlay(play);
      return { play };
    }

    case "deletePlay": {
      const team = await requireTeamByJoin(payload.joinCode);
      await db.deletePlay(team.id, requireUUID(payload.id, "play id"));
      return {};
    }

    case "addComment": {
      // Suggestions are allowed from coaches (join code) AND from anyone
      // viewing via the read-only share code — that's how a youth program
      // sends feedback back up to the varsity staff.
      const code = str(payload.code, 20).toUpperCase();
      const team =
        (await db.teamByJoinCode(code)) ?? (await db.teamByShareCode(code));
      if (!team) throw new RpcError("Team not found", 404);
      const playId = requireUUID(payload.playId, "play id");
      const { plays } = await db.bundle(team.id);
      if (!plays.some((p) => p.id === playId))
        throw new RpcError("Play not found", 404);
      const body = str(payload.body, 2000);
      if (!body) throw new RpcError("Comment is empty");
      const comment: PlayComment = {
        id: crypto.randomUUID(),
        playId,
        coachName: str(payload.coachName, 40) || "Coach",
        body,
        createdAt: new Date().toISOString(),
      };
      await db.addComment(comment);
      return { comment };
    }

    case "importPlaybook": {
      const team = await requireTeamByJoin(payload.joinCode);
      const file = (payload.file ?? {}) as Partial<PlaybookFile>;
      if (file.app !== "playbookgenos" || !Array.isArray(file.formations))
        throw new RpcError("That file doesn't look like an exported playbook");

      // Re-key everything so an import never collides with existing rows.
      const idMap = new Map<string, string>();
      let formationCount = 0;
      for (const rawF of file.formations.slice(0, 200)) {
        const f = sanitizeFormation(
          { ...(rawF as object), id: crypto.randomUUID() },
          team.id,
        );
        idMap.set((rawF as Formation).id, f.id);
        await db.saveFormation(f);
        formationCount++;
      }
      let playCount = 0;
      for (const rawP of (Array.isArray(file.plays) ? file.plays : []).slice(0, 500)) {
        const src = rawP as Play;
        const formationId = idMap.get(src.formationId);
        if (!formationId) continue; // play's formation wasn't in the file
        const p = sanitizePlay(
          {
            ...src,
            id: crypto.randomUUID(),
            formationId,
            defenseFormationId: src.defenseFormationId
              ? (idMap.get(src.defenseFormationId) ?? null)
              : null,
          },
          team.id,
        );
        await db.savePlay(p);
        playCount++;
      }
      return { formationCount, playCount };
    }

    default:
      throw new RpcError(`Unknown action: ${action}`, 404);
  }
}

export async function POST(req: Request) {
  let action = "";
  let payload: Payload = {};
  try {
    const body = await req.json();
    action = typeof body.action === "string" ? body.action : "";
    payload = (body.payload ?? {}) as Payload;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const data = await handle(action, payload);
    return Response.json({ ok: true, data });
  } catch (e) {
    const status = e instanceof RpcError ? e.status : 500;
    const message =
      e instanceof RpcError
        ? e.message
        : "Something went wrong — please try again";
    if (!(e instanceof RpcError)) console.error(`rpc ${action} failed:`, e);
    return Response.json({ ok: false, error: message }, { status });
  }
}
