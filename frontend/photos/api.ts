import { Platform } from 'react-native';
import { request } from '../api/client';
import type { PinCreate } from './pinDraft';

export { ApiError, apiUrl, request } from '../api/client';
export type Photo = { id: string; pin_id: string; width: number; height: number; byte_size: number; created_at: string };
export type Pin = { id: string; title: string; memo: string };
export type PendingPhoto = { uri: string; requestId: string };

export async function uploadPhoto(pinId: string, token: string, photo: PendingPhoto): Promise<Photo> {
  const form = new FormData();
  form.append('client_request_id', photo.requestId);
  if (Platform.OS === 'web') {
    const blob = await (await fetch(photo.uri)).blob();
    if (blob.size > 10 * 1024 * 1024) throw new Error('写真は10MB以内にしてください。');
    form.append('file', blob, 'photo.jpg');
  } else {
    // React Native FormData accepts URI-backed files; browsers use Blob above.
    form.append('file', { uri: photo.uri, name: 'photo.jpg', type: 'image/jpeg' } as unknown as Blob);
  }
  return (await request(`/pins/${encodeURIComponent(pinId)}/photos`, token, { method: 'POST', body: form })).json();
}

export async function createPin(token: string, data: Readonly<PinCreate>): Promise<Pin> {
  return (await request('/pins', token, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  })).json();
}
