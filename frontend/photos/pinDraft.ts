export type PinLocation = { latitude: number; longitude: number; accuracy: number; timestamp: number };
export type PinCreate = { latitude: number; longitude: number; title: string; memo: string; client_request_id: string };

export function validatePinLocation(location: PinLocation, now = Date.now()): PinLocation {
  if (!Number.isFinite(location.latitude) || Math.abs(location.latitude) > 90
    || !Number.isFinite(location.longitude) || Math.abs(location.longitude) > 180
    || !Number.isFinite(location.timestamp) || Math.abs(now - location.timestamp) > 120000) {
    throw new Error('現在地を確認できませんでした。もう一度取得してください。');
  }
  if (!Number.isFinite(location.accuracy) || location.accuracy < 0 || location.accuracy > 100) {
    throw new Error('現在地の精度が低いため、保存できません。見晴らしのよい場所でもう一度取得してください。');
  }
  return location;
}

export function makePinDraft(location: PinLocation, title: string, memo: string, requestId: string): Readonly<PinCreate> {
  validatePinLocation(location);
  const trimmed = title.trim();
  if (!trimmed || [...trimmed].length > 100) throw new Error('場所の名前を1〜100文字で入力してください。');
  if ([...memo].length > 1000) throw new Error('メモは1000文字以内で入力してください。');
  return Object.freeze({ latitude: location.latitude, longitude: location.longitude, title: trimmed, memo, client_request_id: requestId });
}
