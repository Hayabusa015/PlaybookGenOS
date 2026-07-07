-- PlaybookGenOS schema — run once in the Neon SQL editor.

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  join_code text not null unique,
  share_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists formations (
  id uuid primary key,
  team_id uuid not null references teams(id) on delete cascade,
  name text not null,
  side text not null check (side in ('offense', 'defense')),
  player_count int not null,
  players jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists plays (
  id uuid primary key,
  team_id uuid not null references teams(id) on delete cascade,
  formation_id uuid not null references formations(id) on delete cascade,
  defense_formation_id uuid references formations(id) on delete set null,
  name text not null,
  routes jsonb not null default '{}',
  notes text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  play_id uuid not null references plays(id) on delete cascade,
  coach_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists formations_team_idx on formations (team_id);
create index if not exists plays_team_idx on plays (team_id);
create index if not exists comments_play_idx on comments (play_id);
