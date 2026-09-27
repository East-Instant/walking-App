// 散歩中の位置をリアルタイムで受け取り、軌跡に追加していくフック
import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import type { LatLng } from "./project";

const MAX_ACCURACY_M = 25; // これより精度が悪い点（誤差半径が大きい点）は捨てる

export function useLiveWalk(active: boolean) {
  const [points, setPoints] = useState<LatLng[]>([]);
  const [current, setCurrent] = useState<LatLng | null>(null);
  const subRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || cancelled) return;

      subRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 5, // 5m 動くごとに通知
          timeInterval: 2000,  // Android 用: 最短2秒間隔
        },
        (loc) => {
          const p = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setCurrent(p); // 現在地の点は常に更新
          const acc = loc.coords.accuracy ?? Infinity;
          if (acc <= MAX_ACCURACY_M) {
            setPoints((prev) => [...prev, p]); // 精度が良い点だけ線に追加
          }
        }
      );
    })();

    return () => {
      cancelled = true;
      subRef.current?.remove();
      subRef.current = null;
    };
  }, [active]);

  return { points, current };
}