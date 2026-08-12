/**
 * One Euro Filter — low-jitter, low-latency smoothing for noisy signal streams.
 * Casiez, Roussel, Vogel (CHI 2012).
 */
export class OneEuroFilter {
  private xPrev: number | null = null
  private dxPrev = 0
  private tPrev: number | null = null
  private minCutoff: number
  private beta: number
  private dCutoff: number

  constructor(minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
    this.minCutoff = minCutoff
    this.beta = beta
    this.dCutoff = dCutoff
  }

  reset() {
    this.xPrev = null
    this.dxPrev = 0
    this.tPrev = null
  }

  filter(x: number, t: number): number {
    if (this.tPrev === null || this.xPrev === null) {
      this.tPrev = t
      this.xPrev = x
      this.dxPrev = 0
      return x
    }

    const dt = Math.max(1e-6, t - this.tPrev)
    this.tPrev = t

    const edx = (x - this.xPrev) / dt
    const dx = this.expSmooth(this.alpha(dt, this.dCutoff), edx, this.dxPrev)
    this.dxPrev = dx

    const cutoff = this.minCutoff + this.beta * Math.abs(dx)
    const xHat = this.expSmooth(this.alpha(dt, cutoff), x, this.xPrev)
    this.xPrev = xHat
    return xHat
  }

  private alpha(dt: number, cutoff: number): number {
    const tau = 1 / (2 * Math.PI * cutoff)
    return 1 / (1 + tau / dt)
  }

  private expSmooth(a: number, x: number, prev: number): number {
    return a * x + (1 - a) * prev
  }
}

export class OneEuroVec3 {
  private fx: OneEuroFilter
  private fy: OneEuroFilter
  private fz: OneEuroFilter

  constructor(minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
    this.fx = new OneEuroFilter(minCutoff, beta, dCutoff)
    this.fy = new OneEuroFilter(minCutoff, beta, dCutoff)
    this.fz = new OneEuroFilter(minCutoff, beta, dCutoff)
  }

  reset() {
    this.fx.reset()
    this.fy.reset()
    this.fz.reset()
  }

  filter(x: number, y: number, z: number, t: number): [number, number, number] {
    return [this.fx.filter(x, t), this.fy.filter(y, t), this.fz.filter(z, t)]
  }
}
