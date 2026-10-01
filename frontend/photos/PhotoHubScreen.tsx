import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { ApiError, request, type Pin } from './api';
import { NewPlacePhotoModal } from './NewPlacePhotoModal';
import { PhotoAccess, usePhotoSession } from './session';
import { Action, PhotoPage, styles } from './ui';

function PinList() {
  const { token, logout } = usePhotoSession();
  const [adding, setAdding] = useState(false);
  const [pins, setPins] = useState<Pin[]>([]);
  const [offset, setOffset] = useState(0);
  const [next, setNext] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void request(`/pins?limit=20&offset=${offset}`, token, { signal: controller.signal }).then(r => r.json()).then((data: { items: Pin[]; next_offset: number | null }) => {
      if (!controller.signal.aborted) { setPins(data.items); setNext(data.next_offset); setError(''); }
    }).catch(err => {
      if (controller.signal.aborted) return;
      if (err instanceof ApiError && err.status === 401) logout();
      else setError(err.message);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [offset, retry, token, logout]);
  return <PhotoPage>
    <Text style={styles.muted}>WALKING APP / PHOTOS</Text><Text accessibilityRole="header" style={styles.title}>記録一覧</Text>
    <Text style={styles.body}>ここで今までの記録を確認できます。現在地に新しい記録を残すこともできます。</Text>
    <Action title="現在地に新しい場所を追加" onPress={() => setAdding(true)} />
    {loading ? <ActivityIndicator color="#246B4C" /> : error ? <><Text style={styles.error}>{error}</Text><Action title="再読み込み" onPress={() => { setLoading(true); setError(''); setRetry(retry + 1); }} /></>
      : pins.length === 0 ? <View style={styles.card}><Text style={styles.body}>保存した場所はまだありません。「現在地に新しい場所を追加」から、最初の写真を残せます。</Text></View>
        : pins.map(pin => <View key={pin.id} style={styles.card}><Text style={styles.subtitle}>{pin.title}</Text>{!!pin.memo && <Text style={styles.body}>{pin.memo}</Text>}
          <Action title="この場所の写真を見る" secondary onPress={() => router.push({ pathname: '/photos/[pinId]', params: { pinId: pin.id } })} /></View>)}
    {!loading && !error && <View style={styles.row}>{offset > 0 && <Action title="前のページ" secondary onPress={() => { setLoading(true); setOffset(Math.max(0, offset - 20)); }} />}{next !== null && <Action title="次のページ" secondary onPress={() => { setLoading(true); setOffset(next); }} />}</View>}
    <Action title="足跡に戻る" secondary onPress={() => router.replace('/track')} />
    {adding && <NewPlacePhotoModal onClose={() => { setAdding(false); setLoading(true); setError(''); setOffset(0); setRetry(value => value + 1); }} />}
    <Action title="ログアウト" secondary onPress={logout} />
  </PhotoPage>;
}
export default function PhotoHubScreen() { return <PhotoAccess><PinList /></PhotoAccess>; }
