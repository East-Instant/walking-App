import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { ApiError, request, type Pin } from './api';
import { PhotoAccess, usePhotoSession } from './session';
import { Action, PhotoPage, styles } from './ui';

function PinList() {
  const { token, logout } = usePhotoSession();
  const [pins, setPins] = useState<Pin[]>([]);
  const [offset, setOffset] = useState(0);
  const [next, setNext] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    void request(`/pins?limit=20&offset=${offset}`, token, { signal: controller.signal }).then(r => r.json()).then((data: { items: Pin[]; next_offset: number | null }) => {
      if (!controller.signal.aborted) { setPins(data.items); setNext(data.next_offset); }
    }).catch(err => {
      if (controller.signal.aborted) return;
      if (err instanceof ApiError && err.status === 401) logout();
      else setError(err.message);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [offset, retry, token, logout]);
  return <PhotoPage>
    <Text style={styles.muted}>WALKING APP / PHOTOS</Text><Text accessibilityRole="header" style={styles.title}>お気に入りの写真</Text>
    <Text style={styles.body}>写真を残したい場所を選んでください。</Text>
    {loading ? <ActivityIndicator color="#246B4C" /> : error ? <><Text style={styles.error}>{error}</Text><Action title="再読み込み" onPress={() => setRetry(retry + 1)} /></>
      : pins.length === 0 ? <View style={styles.card}><Text style={styles.body}>保存したピンはまだありません。地図で場所を保存すると、写真を追加できます。</Text></View>
        : pins.map(pin => <View key={pin.id} style={styles.card}><Text style={styles.subtitle}>{pin.title}</Text>{!!pin.memo && <Text style={styles.body}>{pin.memo}</Text>}
          <Action title="この場所の写真を見る" secondary onPress={() => router.push({ pathname: '/photos/[pinId]', params: { pinId: pin.id } })} /></View>)}
    {!loading && !error && <View style={styles.row}>{offset > 0 && <Action title="前のページ" secondary onPress={() => setOffset(Math.max(0, offset - 20))} />}{next !== null && <Action title="次のページ" secondary onPress={() => setOffset(next)} />}</View>}
    <Action title="ログアウト" secondary onPress={logout} />
  </PhotoPage>;
}
export default function PhotoHubScreen() { return <PhotoAccess><PinList /></PhotoAccess>; }
