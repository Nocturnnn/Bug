export const MAX_PIXELS = 800_000
export const LOW_POWER_PIXELS = 450_000

export function pixelRatio(width: number, height: number, deviceRatio: number, lowPower: boolean, scale = 1) {
  const budget = lowPower ? LOW_POWER_PIXELS : MAX_PIXELS
  return Math.min(deviceRatio || 1, lowPower ? 1 : 1.25, Math.sqrt(budget / Math.max(1, width * height))) * scale
}

export class RenderQuality {
  scale = 1
  fps: number
  private elapsed = 0
  private samples = 0

  constructor(lowPower: boolean) { this.fps = lowPower ? 24 : 30 }

  sample(deltaMs: number) {
    if (deltaMs <= 0) return false
    this.elapsed += deltaMs
    if (++this.samples < 24) return false
    const average = this.elapsed / this.samples
    this.elapsed = 0
    this.samples = 0
    if (average < 1000 / this.fps * 1.45 || this.scale <= 0.55) return false
    this.scale = Math.max(0.55, this.scale * 0.8)
    this.fps = Math.max(15, this.fps - 6)
    return true
  }
}
