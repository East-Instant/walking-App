import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { ApiError, request, type Photo } from './api';
import { usePhotoSession } from './session';
import { Action, styles } from './ui';

export function PrivatePhoto({ photo, enlarged = false }: { photo: Photo; enlarged?: boolean }) {
  const { token, logout } = usePhotoSession();
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!token) return;
    let active = true;
    const controller = new AbortController();
    const reader = new FileReader();
    void (async () => {
      try {
        const response = await request(`/pins/${photo.pin_id}/photos/${photo.id}`, token, { signal: controller.signal });
        const blob = await response.blob();
        if (!active) return;
        reader.onload = () => { if (active) { setUri(String(reader.result)); setError(false); } };
        reader.onerror = () => { if (active) setError(true); };
        reader.readAsDataURL(blob);
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) logout();
        else setError(true);
      }
    })();
    return () => { active = false; controller.abort(); if (reader.readyState === 1) reader.abort(); };
  }, [photo.pin_id, photo.id, token, logout, retry]);
  return <View style={[enlarged ? styles.preview : styles.thumb, { alignItems: 'center', justifyContent: 'center' }]}>
    {error ? <><Text style={styles.error}>読み込めませんでした</Text><Action title="再読み込み" secondary onPress={() => { setUri(null); setError(false); setRetry(retry + 1); }} /></>
      : uri ? <Image accessibilityLabel="ピンに保存した写真" source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode={enlarged ? 'contain' : 'cover'} onError={() => setError(true)} />
        : <ActivityIndicator color="#246B4C" />}
  </View>;
}
