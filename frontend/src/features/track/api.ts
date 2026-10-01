import { request } from '../../../api/client';
import type { Photo } from '../../../photos/api';
import type { PinDetail, PinPage, RecordedPoint, SavedPin, SavedWalk } from './types';

async function post<T>(path: string, token: string, data: unknown): Promise<T> {
  return (await request(path, token, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  })).json();
}
export const getWalks = async (token: string): Promise<SavedWalk[]> =>
  (await request('/walks/me', token)).json();
export const startWalk = (token: string, requestId: string) =>
  post<SavedWalk>('/walks/start', token, { client_request_id: requestId });
export const savePoints = (token: string, id: string, locations: RecordedPoint[]) =>
  post(`/walks/${id}/locations`, token, { locations });
export const finishWalk = (token: string, id: string, endedAt: string) =>
  post<SavedWalk>(`/walks/${id}/finish`, token, { ended_at: endedAt });
// 地図に出すピンは最大 MAX_PINS 件まで、1回100件ずつ読み込む
const MAX_PINS = 1000;
export async function getPins(token: string, signal?: AbortSignal): Promise<SavedPin[]> {
  const pins: SavedPin[] = [];
  let offset: number | null = 0;
  while (offset !== null && pins.length < MAX_PINS) {
    const page: PinPage = await (await request(`/pins?limit=100&offset=${offset}`, token, { signal })).json();
    pins.push(...page.items);
    offset = page.next_offset;
  }
  return pins.slice(0, MAX_PINS);
}

export const getPinDetail = async (token: string, pinId: string, signal?: AbortSignal): Promise<PinDetail> =>
  (await request(`/pins/${encodeURIComponent(pinId)}`, token, { signal })).json();
export const getPinPhotos = async (token: string, pinId: string, signal?: AbortSignal): Promise<Photo[]> =>
  (await request(`/pins/${encodeURIComponent(pinId)}/photos`, token, { signal })).json();
