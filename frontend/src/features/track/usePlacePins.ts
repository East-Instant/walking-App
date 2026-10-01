// 写真を残した場所（ピン）を読み込むフック。reload() で読み込み直す
import { useCallback, useEffect, useRef, useState } from 'react';
import { getPins } from './api';
import { toPlacePin, type PlacePin } from './types';

export function usePlacePins(token: string) {
  const [pins, setPins] = useState<PlacePin[]>([]);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);

  const reload = useCallback(() => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    getPins(token, current.signal)
      .then(items => {
        if (current.signal.aborted) return;
        setPins(items.map(toPlacePin));
        setError('');
      })
      .catch(() => { if (!current.signal.aborted) setError('写真の場所を読み込めませんでした。'); });
  }, [token]);

  useEffect(() => {
    reload();
    return () => controller.current?.abort();
  }, [reload]);

  return { pins, error, reload };
}
