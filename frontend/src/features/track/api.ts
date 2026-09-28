import { request } from '../../../api/client';
import type { RecordedPoint, SavedWalk } from './types';

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
