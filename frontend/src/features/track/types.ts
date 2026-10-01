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
// 写真を残した場所（ピン）。地図には座標と名前だけを使う
export type PlacePin = LatLng & { id: string; title: string };
export type SavedPin = { id: string; latitude: number; longitude: number; title: string };
export type PinPage = { items: SavedPin[]; next_offset: number | null };
export const toPlacePin = (pin: SavedPin): PlacePin => ({
  id: pin.id,
  title: pin.title,
  lat: pin.latitude,
  lng: pin.longitude,
});
export type PinDetail = SavedPin & { memo: string; created_at: string };
