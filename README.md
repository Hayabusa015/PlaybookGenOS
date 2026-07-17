# 🏈 PlaybookGenOS

Design American-football formations and plays in the browser, build a team
playbook, and share it with every coach in your program — from the varsity
staff down to the youth league.

## What it does

- **Formations** — drag X's and O's into position on a real field (yard
  lines, hashes, line of scrimmage). Supports 11-man, 8-man, 7v7, and 5v5
  flag rosters, offense and defense.
- **Plays** — pick a formation, tap a player, tap the field to draw their
  route (arrow = route/run, ⊥ = block), and type each player's assignment.
  Optionally ghost a defensive look behind the play.
- **Animation** — hit *Run play* and every player slides along their route.
  The clearest way to teach a play to kids and new assistants.
- **Sharing** — two codes per team:
  - **Coach code** (e.g. `EAGLES-4F2`): full edit access for your staff.
  - **Share link** (read-only): send it to your youth program or players.
    They can browse plays, run animations, and leave *suggestions*, but
    can't change anything.
- **Playbook as a file** — export/import the whole playbook as JSON, and a
  print view for a paper playbook or PDF.

No accounts, no passwords — a coach just enters their name.

## Stack

- [Next.js](https://nextjs.org) (App Router) on **Vercel**
- **Neon** Postgres via `@neondatabase/serverless`
- Exactly **one serverless function**: `app/api/rpc/route.ts` handles every
  data operation. Everything else is static/client-side.

## Local development

```bash
npm install
npm run dev
```

With no `DATABASE_URL` set, the app runs on an in-memory store (data resets
on restart) — perfect for trying it out.

## Deploy to Vercel + Neon

1. Create a Neon project at [neon.tech](https://neon.tech) and run the
   contents of [`schema.sql`](./schema.sql) in the Neon SQL editor.
2. Import this repo at [vercel.com/new](https://vercel.com/new).
3. Add one environment variable: `DATABASE_URL` = your Neon connection
   string (the pooled one is fine).
4. Deploy.
