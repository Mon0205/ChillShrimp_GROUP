import assert from 'node:assert/strict'
import test from 'node:test'
import { measurePixels, precheckWarnings } from './photo-precheck.js'

function rgbaFrom(width, height, pixel) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = pixel(x, y), i = (y * width + x) * 4
      data[i] = data[i + 1] = data[i + 2] = value
      data[i + 3] = 255
    }
  }
  return data
}

const codes = (warnings) => warnings.map((warning) => `${warning.code}:${warning.level}`)

test('a flat grey image has no texture and reads as blurry', () => {
  const metrics = measurePixels(rgbaFrom(50, 40, () => 128), 50, 40)
  assert.equal(metrics.brightness, 128)
  assert.equal(metrics.sharpness, 0)
  assert.deepEqual(codes(precheckWarnings({ longSide: 2000, ...metrics })), ['blurry:warning'])
})

test('a checkerboard is sharp', () => {
  const metrics = measurePixels(rgbaFrom(40, 40, (x, y) => ((x + y) % 2 ? 220 : 40)), 40, 40)
  assert.ok(metrics.sharpness > 1000)
})

test('a small image is only an info note, never a blocking warning', () => {
  const ok = { brightness: 150, sharpness: 50 }
  assert.deepEqual(codes(precheckWarnings({ longSide: 320, ...ok })), ['small_image:info'])
  assert.deepEqual(codes(precheckWarnings({ longSide: 1599, ...ok })), ['small_image:info'])
  assert.deepEqual(codes(precheckWarnings({ longSide: 1600, ...ok })), [])
  assert.match(precheckWarnings({ longSide: 320, ...ok })[0].message, /Ảnh nhỏ \(320px/)
})

test('exposure thresholds follow photo_check.py', () => {
  const ok = { longSide: 2000, sharpness: 50 }
  assert.deepEqual(codes(precheckWarnings({ brightness: 59, ...ok })), ['too_dark:warning'])
  assert.deepEqual(codes(precheckWarnings({ brightness: 60, ...ok })), [])
  assert.deepEqual(codes(precheckWarnings({ brightness: 211, ...ok })), ['too_bright:warning'])
})
