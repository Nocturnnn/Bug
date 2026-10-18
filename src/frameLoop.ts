type Driver = {
  requestAnimationFrame: (callback: FrameRequestCallback) => number
  cancelAnimationFrame: (id: number) => void
}

// A single queued callback, a capped frame rate, and no callbacks while idle.
// Injecting the driver allows deterministic tests without a browser or GPU.
export function createFrameLoop(render: (delta: number) => boolean, frameRate: () => number, driver: Driver) {
  let frame: number | undefined
  let active = false
  let disposed = false
  let previous: number | undefined

  function invalidate() {
    if (active && !disposed && frame === undefined) frame = driver.requestAnimationFrame(tick)
  }

  function tick(now: number) {
    frame = undefined
    if (!active || disposed) return
    const interval = 1000 / frameRate()
    if (previous !== undefined && now - previous < interval - 0.5) { invalidate(); return }
    const delta = previous === undefined ? 0 : (now - previous) / 1000
    previous = now
    const continuous = render(delta)
    if (continuous) invalidate()
    if (frame === undefined) previous = undefined
  }

  return {
    invalidate,
    setActive(value: boolean) {
      if (active === value) return
      active = value
      previous = undefined
      if (value) invalidate()
      else if (frame !== undefined) { driver.cancelAnimationFrame(frame); frame = undefined }
    },
    dispose() {
      disposed = true
      if (frame !== undefined) driver.cancelAnimationFrame(frame)
      frame = undefined
    },
  }
}
