import { Platform } from 'react-native';

export const apiUrl = (
  Platform.OS === 'web'
    ? (process.env.EXPO_PUBLIC_WEB_API_URL ?? '/api')
    : (process.env.EXPO_PUBLIC_API_URL
      ?? (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000'))
).replace(/\/$/, '');

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
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
      const message = response.status === 401
        ? 'ログイン情報を確認してください。'
        : typeof data?.detail === 'string'
          ? data.detail
          : '処理を完了できませんでした。もう一度お試しください。';
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
