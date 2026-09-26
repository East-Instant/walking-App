import { Platform } from 'react-native';

export const apiUrl = (process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000')).replace(/\/$/, '');
export type Photo = { id: string; pin_id: string; width: number; height: number; byte_size: number; created_at: string };
export type Pin = { id: string; title: string; memo: string };
export type PendingPhoto = { uri: string; requestId: string };

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function request(path: string, token: string | null, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort);
  if (options.signal?.aborted) controller.abort();
  const timeout = setTimeout(abort, 30000);
  try {
    const headers = new Headers(options.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(`${apiUrl}${path}`, { ...options, headers, signal: controller.signal, cache: 'no-store' });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const message = response.status === 401 ? 'ログインの有効期限が切れました。もう一度ログインしてください。'
        : typeof data?.detail === 'string' ? data.detail : '処理を完了できませんでした。もう一度お試しください。';
      throw new ApiError(response.status, message);
    }
    return response;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error('通信できませんでした。接続を確認して、もう一度お試しください。');
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abort);
  }
}

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
