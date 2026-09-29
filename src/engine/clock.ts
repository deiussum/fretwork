/** Time source in seconds. The audio clock is the single time base for sessions. */
export interface Clock {
  now(): number
}

/** Manually advanced clock for tests. */
export class FakeClock implements Clock {
  private time: number

  constructor(start = 0) {
    this.time = start
  }

  now(): number {
    return this.time
  }

  advance(seconds: number): void {
    this.time += seconds
  }
}
