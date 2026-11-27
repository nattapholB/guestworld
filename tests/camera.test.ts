import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  BASE_CAMERA_Z,
  CAMERA_FOV_DEG,
  REQUIRED_HALF_WIDTH,
  getCameraDistance,
} from '../src/components/Background/cameraFraming'

const TAN_HALF_FOV = Math.tan((CAMERA_FOV_DEG * Math.PI) / 360)

test('getCameraDistance keeps BASE_CAMERA_Z on desktop and widens distance for iPhone 15 Pro portrait', () => {
  // Desktop 1280x800 and iPhone 15 Pro landscape 852x393 stay at base distance.
  assert.equal(getCameraDistance(1280 / 800), BASE_CAMERA_Z)
  assert.equal(getCameraDistance(852 / 393), BASE_CAMERA_Z)

  // iPhone 15 Pro portrait (393x852) pulls camera back so Keyboard3D (half-width 3.19) fits with margin.
  const iphoneAspect = 393 / 852
  const z = getCameraDistance(iphoneAspect)
  assert.ok(z > BASE_CAMERA_Z)
  const visibleHalfWidth = z * TAN_HALF_FOV * iphoneAspect
  assert.ok(visibleHalfWidth >= REQUIRED_HALF_WIDTH - 1e-6)
  assert.ok(visibleHalfWidth > 3.19)

  // Defensive fallback for invalid aspect ratios.
  assert.equal(getCameraDistance(0), BASE_CAMERA_Z)
  assert.equal(getCameraDistance(Number.NaN), BASE_CAMERA_Z)
})
