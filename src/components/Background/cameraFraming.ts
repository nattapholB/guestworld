export const BASE_CAMERA_Z = 10.5
export const CAMERA_FOV_DEG = 55
// Keyboard3D row 2 spans 6.38 world units (±3.19); 3.55 half-width keeps side margin for parallax and taps.
export const REQUIRED_HALF_WIDTH = 3.55

const TAN_HALF_FOV = Math.tan((CAMERA_FOV_DEG * Math.PI) / 360)

/** Computes camera distance from z=0 so the 3D keyboard fits horizontally on narrow/portrait viewports. */
export function getCameraDistance(aspect: number): number {
  if (!Number.isFinite(aspect) || aspect <= 0) return BASE_CAMERA_Z
  return Math.max(BASE_CAMERA_Z, REQUIRED_HALF_WIDTH / (TAN_HALF_FOV * aspect))
}
