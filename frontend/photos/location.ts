import * as Location from 'expo-location';
import { validatePinLocation, type PinLocation } from './pinDraft';

export async function locatePin(): Promise<PinLocation> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('場所を保存するには位置情報の許可が必要です。ブラウザや端末の設定を確認してください。');
  if (!(await Location.hasServicesEnabledAsync())) throw new Error('端末の位置情報をオンにしてください。');
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const location = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('現在地の取得に時間がかかっています。もう一度お試しください。')), 20000);
      }),
    ]);
    return validatePinLocation({
      latitude: location.coords.latitude, longitude: location.coords.longitude,
      accuracy: location.coords.accuracy ?? Infinity, timestamp: location.timestamp,
    });
  } finally { clearTimeout(timer); }
}
