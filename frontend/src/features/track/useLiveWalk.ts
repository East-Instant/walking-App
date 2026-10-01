import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import type { LatLng } from './project';
import type { RecordedPoint } from './types';

export function useLiveWalk() {
  const [current, setCurrent] = useState<LatLng | null>(null);
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const generation = useRef(0);
  const stop = useCallback(() => {
    generation.current += 1;
    subscription.current?.remove();
    subscription.current = null;
  }, []);
  useEffect(() => stop, [stop]);

  const prepare = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('散歩の記録には位置情報の許可が必要です。端末の設定を確認してください。');
    if (!(await Location.hasServicesEnabledAsync())) throw new Error('端末の位置情報をオンにしてください。');
  };

  const start = async (onPoint: (point: Omit<RecordedPoint, 'sequence'>) => void, onError: () => void) => {
    stop();
    setCurrent(null);
    const version = generation.current;
    // Watching starts with the OS's cached last fix, which can be far from here; record only fresh fixes.
    const startedAt = Date.now();
    const sub = await Location.watchPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5, timeInterval: 2000,
    }, location => {
      if (generation.current !== version) return;
      const { latitude, longitude, accuracy } = location.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
      setCurrent({ lat: latitude, lng: longitude });
      if ((accuracy ?? Infinity) <= 25 && Number.isFinite(location.timestamp) && location.timestamp >= startedAt) {
        onPoint({ latitude, longitude, recorded_at: new Date(location.timestamp).toISOString() });
      }
    }, () => { if (generation.current === version) onError(); });
    // The component may have stopped/unmounted while the subscription was being created.
    if (generation.current !== version) sub.remove();
    else subscription.current = sub;
  };

  return { current, prepare, start, stop };
}
