// Shared Tailwind class strings so buttons/inputs look the same everywhere.
export const btn =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
export const btnPrimary = `${btn} bg-amber-500 text-neutral-950 hover:bg-amber-400 px-4 py-2`;
export const btnGhost = `${btn} bg-neutral-800 text-neutral-200 hover:bg-neutral-700 px-3 py-1.5 text-sm`;
export const btnDanger = `${btn} bg-rose-900/60 text-rose-200 hover:bg-rose-900 px-3 py-1.5 text-sm`;
export const input =
  "rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-neutral-100 placeholder-neutral-500 outline-none focus:border-amber-500";
export const card = "rounded-xl border border-neutral-800 bg-neutral-900";
