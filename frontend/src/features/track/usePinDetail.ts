// ピン1件の詳細（名前・メモ）と写真一覧を読み込むフック
import { useCallback, useEffect, useState } from 'react';
import type { Photo } from '../../../photos/api';
import { getPinDetail, getPinPhotos } from './api';
import type { PinDetail } from './types';

export function usePinDetail(token: string, pinId: string) {
  const [pin, setPin] = useState<PinDetail | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getPinDetail(token, pinId, controller.signal), getPinPhotos(token, pinId, controller.signal)])
      .then(([pinData, photoData]) => {
        if (controller.signal.aborted) return;
        setPin(pinData);
        setPhotos(photoData);
        setError('');
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : '記録を読み込めませんでした。');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, pinId, attempt]);

  const reload = useCallback(() => {
    setLoading(true);
    setAttempt(n => n + 1);
  }, []);

  return { pin, photos, loading, error, reload };
}
