// Field geometry, in yards. The visible window is the width of a football
// field by 40 yards of depth, with the line of scrimmage 24 yards down —
// room for a deep secondary above and a full backfield below.
export const FIELD_W = 53.33;
export const FIELD_H = 40;
export const LOS_Y = 24;

export const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
