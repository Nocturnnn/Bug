import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { createFrameLoop } from '../src/frameLoop.ts'
import { pixelRatio, RenderQuality, MAX_PIXELS, LOW_POWER_PIXELS } from '../src/renderingPolicy.ts'
import { createStructureMode } from '../src/structureMode.ts'

function clock() {
  const callbacks = new Map()
  let id = 0
  return {
    requestAnimationFrame(callback) { callbacks.set(++id, callback); return id },
    cancelAnimationFrame(id) { callbacks.delete(id) },
    tick(now) { const next = [...callbacks.values()]; callbacks.clear(); next.forEach(callback => callback(now)) },
    get pending() { return callbacks.size },
  }
}

test('paused or static structure renders once and then stops; input wakes it', () => {
  const driver = clock()
  let renders = 0
  const loop = createFrameLoop(() => { renders++; return false }, () => 30, driver)
  loop.setActive(true)
  loop.invalidate(); loop.invalidate()
  assert.equal(driver.pending, 1)
  driver.tick(0)
  for (let now = 16; now < 5000; now += 16) driver.tick(now)
  assert.equal(renders, 1)
  assert.equal(driver.pending, 0)
  loop.invalidate(); driver.tick(5000)
  assert.equal(renders, 2)
})

test('animation is capped at 30 fps on a 144 Hz display', () => {
  const driver = clock()
  let renders = 0
  const loop = createFrameLoop(() => { renders++; return true }, () => 30, driver)
  loop.setActive(true)
  for (let frame = 0; frame <= 144; frame++) driver.tick(frame * 1000 / 144)
  assert.ok(renders <= 31 && renders >= 24, `Actual renders: ${renders}`)
  loop.dispose()
  assert.equal(driver.pending, 0)
})

test('hidden scene cancels all work and ignores input until it returns', () => {
  const driver = clock()
  let renders = 0
  const loop = createFrameLoop(() => { renders++; return true }, () => 30, driver)
  loop.setActive(true); driver.tick(0)
  loop.setActive(false); loop.invalidate()
  assert.equal(driver.pending, 0)
  driver.tick(2000)
  assert.equal(renders, 1)
  loop.setActive(true); driver.tick(4000)
  assert.equal(renders, 2)
  loop.dispose(); loop.invalidate()
  assert.equal(driver.pending, 0)
})

test('pixel count stays within budget even on high-DPI 4K screens', () => {
  for (const [width, height] of [[390, 650], [1280, 900], [3840, 2160], [7680, 4320]]) {
    for (const lowPower of [true, false]) {
      const ratio = pixelRatio(width, height, 3, lowPower)
      assert.ok(width * height * ratio ** 2 <= (lowPower ? LOW_POWER_PIXELS : MAX_PIXELS) + 1)
      assert.ok(ratio <= 1.25)
    }
  }
})

test('sustained slow frames lower resolution and frame rate without oscillation', () => {
  const quality = new RenderQuality(false)
  for (let i = 0; i < 24; i++) quality.sample(80)
  assert.ok(quality.scale < 1)
  assert.equal(quality.fps, 24)
  for (let i = 0; i < 240; i++) quality.sample(200)
  assert.ok(quality.scale >= 0.55)
  assert.ok(quality.fps >= 15)
  const scale = quality.scale
  for (let i = 0; i < 240; i++) quality.sample(16)
  assert.equal(quality.scale, scale)
})

test('100 structure toggles reuse one unlit material and preserve the actual GLB', async () => {
  const file = await readFile(new URL('../public/models/borboleta_iridescente.glb', import.meta.url))
  const gltf = await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '')
  const mode = createStructureMode()
  const parts = []
  gltf.scene.traverse(node => { if (node.isMesh) { parts.push({ mesh: node, original: node.material, geometry: node.geometry }); mode.register(node) } })
  assert.equal(parts.length, 21)
  let structureMaterial
  const edgeCount = parts.reduce((sum, { mesh }) => sum + mesh.children.find(child => child.isLineSegments).geometry.index.count / 2, 0)
  assert.ok(edgeCount < 75_000, `Actual unique edges: ${edgeCount}`)
  for (let i = 0; i < 100; i++) {
    mode.setEnabled(true)
    const unique = new Set(parts.map(({ mesh }) => mesh.children.find(child => child.isLineSegments).material))
    assert.equal(unique.size, 1)
    const current = [...unique][0]
    if (structureMaterial) assert.equal(current, structureMaterial)
    structureMaterial = current
    assert.equal(current.isLineBasicMaterial, true)
    assert.equal(current.transparent, false)
    parts.forEach(({ mesh, original, geometry }) => {
      const lines = mesh.children.find(child => child.isLineSegments)
      assert.equal(mesh.layers.mask, 0)
      assert.equal(lines.visible, true)
      assert.equal(lines.geometry.getAttribute('position'), geometry.getAttribute('position'))
      assert.equal(mesh.material, original)
    })
    mode.setEnabled(false)
    parts.forEach(({ mesh, original, geometry }) => { assert.equal(mesh.material, original); assert.equal(mesh.geometry, geometry); assert.equal(original.wireframe, false); assert.equal(mesh.layers.mask, 1) })
  }
  mode.dispose()
  parts.forEach(({ mesh }) => { mesh.geometry.dispose(); mesh.material.dispose() })
})
