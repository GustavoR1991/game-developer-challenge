export interface FixedStepClockOptions {
  stepSeconds: number;
  maxFrameSeconds: number;
}

export class FixedStepClock {
  readonly stepSeconds: number;
  private readonly maxFrameSeconds: number;
  private accumulator = 0;

  constructor(options: FixedStepClockOptions) {
    this.stepSeconds = options.stepSeconds;
    this.maxFrameSeconds = options.maxFrameSeconds;
  }

  advance(frameSeconds: number, step: (stepSeconds: number) => void): number {
    this.accumulator += Math.min(Math.max(frameSeconds, 0), this.maxFrameSeconds);
    let steps = 0;
    while (this.accumulator >= this.stepSeconds) {
      this.accumulator -= this.stepSeconds;
      step(this.stepSeconds);
      steps += 1;
    }
    return steps;
  }

  get alpha(): number {
    return this.accumulator / this.stepSeconds;
  }

  reset(): void {
    this.accumulator = 0;
  }
}
