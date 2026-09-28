import type { RecordedPoint } from './types';

/** Keep failed batches until acknowledged. One sender also serializes finish with autosave. */
export class PointQueue {
  readonly points: RecordedPoint[] = [];
  private acknowledged = 0;
  private inFlight: Promise<void> | null = null;

  get pending() { return this.points.length - this.acknowledged; }

  add(point: Omit<RecordedPoint, 'sequence'>) {
    this.points.push({ ...point, sequence: this.points.length });
  }

  async flush(send: (points: RecordedPoint[]) => Promise<unknown>): Promise<void> {
    if (this.inFlight) {
      await this.inFlight;
      return this.flush(send);
    }
    // A finite snapshot avoids keeping autosave running forever while GPS is active.
    const end = this.points.length;
    const work = async () => {
      while (this.acknowledged < end) {
        const batch = this.points.slice(this.acknowledged, Math.min(this.acknowledged + 500, end));
        await send(batch);
        this.acknowledged += batch.length;
      }
    };
    this.inFlight = work();
    try { await this.inFlight; } finally { this.inFlight = null; }
  }
}
