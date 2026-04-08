export interface Vector {
  x: number;
  y: number;
}

export const add = (v1: Vector, v2: Vector): Vector => ({ x: v1.x + v2.x, y: v1.y + v2.y });
export const sub = (v1: Vector, v2: Vector): Vector => ({ x: v1.x - v2.x, y: v1.y - v2.y });
export const mul = (v: Vector, s: number): Vector => ({ x: v.x * s, y: v.y * s });
export const div = (v: Vector, s: number): Vector => ({ x: v.x / s, y: v.y / s });
export const dot = (v1: Vector, v2: Vector): number => v1.x * v2.x + v1.y * v2.y;
export const magSq = (v: Vector): number => v.x * v.x + v.y * v.y;
export const mag = (v: Vector): number => Math.sqrt(magSq(v));
export const normalize = (v: Vector): Vector => {
  const m = mag(v);
  return m === 0 ? { x: 0, y: 0 } : div(v, m);
};
export const dist = (v1: Vector, v2: Vector): number => mag(sub(v1, v2));

/**
 * Aplica colisión elástica entre dos círculos.
 * v1' = v1 - (2*m2 / (m1+m2)) * (dot(v1-v2, x1-x2) / magSq(x1-x2)) * (x1-x2)
 */
export const resolveCollision = (
  p1: Vector, v1: Vector, m1: number,
  p2: Vector, v2: Vector, m2: number
): { v1: Vector; v2: Vector } => {
  const xDiff = sub(p1, p2);
  const vDiff = sub(v1, v2);
  const mFactor1 = (2 * m2) / (m1 + m2);
  const dotVal1 = dot(vDiff, xDiff) / magSq(xDiff);
  
  const newV1 = sub(v1, mul(xDiff, mFactor1 * dotVal1));

  const xDiff2 = sub(p2, p1);
  const vDiff2 = sub(v2, v1);
  const mFactor2 = (2 * m1) / (m1 + m2);
  const dotVal2 = dot(vDiff2, xDiff2) / magSq(xDiff2);
  
  const newV2 = sub(v2, mul(xDiff2, mFactor2 * dotVal2));

  return { v1: newV1, v2: newV2 };
};
