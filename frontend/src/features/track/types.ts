import type { LatLng } from './project';

export type Walk = { id: string; startedAt: string; points: LatLng[] };
export type RecordedPoint = {
  latitude: number;
  longitude: number;
  sequence: number;
  recorded_at: string;
};
export type SavedWalk = {
  id: string;
  started_at: string;
  ended_at: string | null;
  locations: RecordedPoint[];
};
export const toWalk = (walk: SavedWalk): Walk => ({
  id: walk.id,
  startedAt: walk.started_at,
  points: walk.locations.map(p => ({ lat: p.latitude, lng: p.longitude })),
});
