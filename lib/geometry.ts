export type Pt = [number, number];

export function pathLength(pts: Pt[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  return len;
}

/** Point at `dist` along the polyline (clamped to its ends). */
export function pointAt(pts: Pt[], dist: number): Pt {
  if (pts.length === 0) return [0, 0];
  if (dist <= 0) return pts[0];
  let remaining = dist;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (remaining <= seg && seg > 0) {
      const t = remaining / seg;
      return [
        pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t,
        pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t,
      ];
    }
    remaining -= seg;
  }
  return pts[pts.length - 1];
}

/** Direction (radians) of the last segment of a polyline. */
export function endAngle(pts: Pt[]): number {
  for (let i = pts.length - 1; i > 0; i--) {
    const dx = pts[i][0] - pts[i - 1][0];
    const dy = pts[i][1] - pts[i - 1][1];
    if (dx !== 0 || dy !== 0) return Math.atan2(dy, dx);
  }
  return -Math.PI / 2; // default: straight upfield
}

/**
 * SVG path for a polyline with rounded corners — reads like a
 * hand-drawn coaching diagram instead of a jagged connect-the-dots.
 */
export function smoothPathD(pts: Pt[], radius = 1.4): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[i + 1];
    const inLen = Math.hypot(cx - px, cy - py);
    const outLen = Math.hypot(nx - cx, ny - cy);
    const r = Math.min(radius, inLen / 2, outLen / 2);
    if (inLen === 0 || outLen === 0 || r <= 0.01) {
      d += ` L ${cx} ${cy}`;
      continue;
    }
    const inX = cx - ((cx - px) / inLen) * r;
    const inY = cy - ((cy - py) / inLen) * r;
    const outX = cx + ((nx - cx) / outLen) * r;
    const outY = cy + ((ny - cy) / outLen) * r;
    d += ` L ${inX} ${inY} Q ${cx} ${cy} ${outX} ${outY}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last[0]} ${last[1]}`;
  return d;
}
