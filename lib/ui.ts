// Shared Tailwind class strings so buttons/inputs look the same everywhere.
export const btn =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
export const btnPrimary = `${btn} bg-emerald-500 text-emerald-950 hover:bg-emerald-400 px-4 py-2`;
export const btnGhost = `${btn} bg-slate-800 text-slate-100 hover:bg-slate-700 px-3 py-1.5 text-sm`;
export const btnDanger = `${btn} bg-rose-900/60 text-rose-200 hover:bg-rose-900 px-3 py-1.5 text-sm`;
export const input =
  "rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500";
export const card = "rounded-xl border border-slate-800 bg-slate-900";
