import { router, useLocalSearchParams } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { randomUUID } from 'expo-crypto';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { ApiError, request, uploadPhoto, type PendingPhoto, type Photo, type Pin } from './api';
import { PrivatePhoto } from './PrivatePhoto';
import { PhotoAccess, usePhotoSession } from './session';
import { Action, PhotoPage, styles } from './ui';

export function Gallery({ pinId, onClose, onCloseBlockedChange }: {
  pinId: string; onClose?: () => void; onCloseBlockedChange?: (blocked: boolean) => void;
}) {
  const { token, logout, suspended } = usePhotoSession();
  const [pin, setPin] = useState<Pin | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const pickVersion = useRef(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null);
  const [selected, setSelected] = useState<Photo | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const active = useRef(true);
  const pending = useRef(false);
  useEffect(() => {
    onCloseBlockedChange?.(busy || !!pendingPhoto);
    return () => onCloseBlockedChange?.(false);
  }, [busy, pendingPhoto, onCloseBlockedChange]);
  usePreventRemove(!onClose && (busy || !!pendingPhoto), () => {
    setNotice('写真を保存するかキャンセルしてから戻ってください。');
  });
  useEffect(() => {
    if (onClose || Platform.OS !== 'web' || (!busy && !pendingPhoto)) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [onClose, busy, pendingPhoto]);
  const path = `/pins/${encodeURIComponent(pinId)}`;
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  const report = useCallback((err: unknown) => {
    if (!active.current) return;
    if (err instanceof ApiError && err.status === 401) logout();
    else setError(err instanceof Error ? err.message : '処理を完了できませんでした。');
  }, [logout]);
  const reload = useCallback((signal?: AbortSignal) => {
    return Promise.all([
      request(path, token, { signal }), request(`${path}/photos`, token, { signal }),
    ]).then(async ([pinResponse, photoResponse]) => {
      const [pinData, photoData] = await Promise.all([pinResponse.json(), photoResponse.json()]);
      if (active.current && !signal?.aborted) {
        setPin(pinData); setPhotos(photoData); setLoadError(false); setError('');
      }
    }).catch(err => {
      if (!signal?.aborted && active.current) { setLoadError(true); report(err); }
    }).finally(() => { if (active.current && !signal?.aborted) setLoading(false); });
  }, [path, token, report]);
  useEffect(() => {
    const controller = new AbortController();
    void reload(controller.signal);
    return () => controller.abort();
  }, [reload]);

  async function pick(camera: boolean) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setPicking(true); setError(''); setNotice('');
    const version = ++pickVersion.current;
    try {
      if (camera && Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) throw new Error('撮影にはカメラの許可が必要です。端末の設定で許可してください。');
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.85, exif: false, allowsMultipleSelection: false };
      // On web this must run directly from a user gesture, without an earlier await.
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (version !== pickVersion.current || !active.current) return;
      setPicking(false);
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.width * asset.height > 24_000_000) throw new Error('写真は2400万画素以内のものを選んでください。');
      const context = ImageManipulator.manipulate(asset.uri);
      try {
        if (Math.max(asset.width, asset.height) > 1600) {
          context.resize(asset.width >= asset.height ? { width: 1600 } : { height: 1600 });
        }
        const image = await context.renderAsync();
        try {
          const converted = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
          if (active.current) setPendingPhoto({ uri: converted.uri, requestId: randomUUID() });
        } finally { image.release(); }
      } finally { context.release(); }
    } catch (err) { if (version === pickVersion.current) report(err); }
    finally {
      if (version === pickVersion.current) {
        pending.current = false;
        if (active.current) { setBusy(false); setPicking(false); }
      }
    }
  }

  async function upload() {
    if (!pendingPhoto || !token || pending.current) return;
    pending.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const photo = await uploadPhoto(pinId, token, pendingPhoto);
      if (!active.current) return;
      setPhotos(previous => previous.some(p => p.id === photo.id) ? previous : [...previous, photo]);
      setPendingPhoto(null); setNotice('写真を保存しました。');
    } catch (err) { report(err); } // Keep the same URI/request ID for retries.
    finally { pending.current = false; if (active.current) setBusy(false); }
  }

  async function remove() {
    if (!selected || pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try {
      try { await request(`${path}/photos/${selected.id}`, token, { method: 'DELETE' }); }
      catch (err) { if (!(err instanceof ApiError && err.status === 404)) throw err; }
      if (!active.current) return;
      setPhotos(previous => previous.filter(photo => photo.id !== selected.id));
      setSelected(null); setConfirmDelete(false); setNotice('写真を削除しました。');
    } catch (err) { report(err); }
    finally { pending.current = false; if (active.current) setBusy(false); }
  }

  return <PhotoPage>
    <Action title={onClose ? "閉じる" : "ピン一覧に戻る"} secondary disabled={busy || !!pendingPhoto} onPress={onClose ?? (() => router.replace('/photos'))} />
    {!!pendingPhoto && <Text style={styles.muted}>戻る前に、選んだ写真を保存するかキャンセルしてください。</Text>}
    <Text style={styles.muted}>WALKING APP / YOUR MEMORIES</Text>
    <Text accessibilityRole="header" style={styles.title}>{pin?.title ?? 'この場所の写真'}</Text>
    <Text style={styles.body}>散歩で見つけた、お気に入りの景色を残しましょう。</Text>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {!!notice && <Text accessibilityLiveRegion="polite" style={styles.success}>{notice}</Text>}
    {loading ? <ActivityIndicator color="#246B4C" /> : loadError ? <Action title="再読み込み" onPress={() => { setLoading(true); void reload(); }} /> : <>
      <View style={styles.card}>
        <Text style={styles.subtitle}>写真を追加する</Text><Text style={styles.muted}>最大5枚・1枚10MBまで。写真はあなただけが見られます。</Text>
        {photos.length >= 5 && <Text style={styles.body}>5枚保存されています。追加するには写真を削除してください。</Text>}
        <Action title="写真を撮る" disabled={busy || photos.length >= 5 || !!pendingPhoto} onPress={() => { void pick(true); }} />
        <Action title="写真ライブラリから選ぶ" secondary disabled={busy || photos.length >= 5 || !!pendingPhoto} onPress={() => { void pick(false); }} />
        {Platform.OS === 'web' && <Text style={styles.muted}>ブラウザーの撮影操作は端末によって異なります。撮影できない場合は写真を選択してください。</Text>}
        {Platform.OS === 'web' && picking && <Action title="写真の選択をやめる" secondary onPress={() => { pickVersion.current += 1; pending.current = false; setPicking(false); setBusy(false); }} />}
        {busy && !pendingPhoto && <ActivityIndicator accessibilityLabel="写真を処理しています" color="#246B4C" />}
      </View>
      {pendingPhoto && <View style={styles.card}>
        <Text style={styles.subtitle}>この写真を保存しますか？</Text>
        <Image accessibilityLabel="アップロード前の写真" source={{ uri: pendingPhoto.uri }} style={styles.preview} resizeMode="contain" />
        <Text style={styles.muted}>保存時に画像を縮小し、GPSなどのメタデータを除去します。</Text>
        <Action title={busy ? '保存中…' : 'この場所に保存する'} busy={busy} onPress={() => { void upload(); }} />
        <Action title="キャンセル" secondary disabled={busy} onPress={() => { setPendingPhoto(null); setError(''); }} />
      </View>}
      <View style={styles.row}><Text accessibilityRole="header" style={styles.subtitle}>保存した写真</Text><Text style={styles.muted}>{photos.length} / 5枚</Text></View>
      {photos.length === 0 ? <View style={[styles.card, styles.empty]}><Text style={styles.subtitle}>まだ写真がありません</Text><Text style={styles.body}>最初の1枚を残してみましょう。</Text></View>
        : <View style={styles.grid}>{photos.map(photo => <View key={photo.id} style={styles.tile}>
          <PrivatePhoto photo={photo} />
          <Pressable accessibilityRole="button" accessibilityLabel="写真を拡大表示" disabled={busy} style={styles.button} onPress={() => { setSelected(photo); setConfirmDelete(false); setError(''); }}><Text style={styles.buttonText}>写真を見る</Text></Pressable>
        </View>)}</View>}
    </>}
    <Modal visible={!!selected && !suspended} transparent animationType="fade" onRequestClose={() => { if (!busy) { setSelected(null); setConfirmDelete(false); } }}>
      <View style={styles.overlay}><View accessibilityViewIsModal style={styles.modal}><ScrollView contentContainerStyle={{ gap: 16 }}>
        <Text accessibilityRole="header" style={styles.subtitle}>{confirmDelete ? '写真を削除しますか？' : 'お気に入りの1枚'}</Text>
        {selected && <PrivatePhoto key={selected.id} photo={selected} enlarged />}
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {confirmDelete ? <><Text style={styles.body}>保存した写真は元に戻せません。端末の元の写真は削除されません。</Text><Action title={busy ? '削除中…' : '削除する'} danger busy={busy} onPress={() => { void remove(); }} /><Action title="削除をやめる" secondary disabled={busy} onPress={() => setConfirmDelete(false)} /></>
          : <Action title="この写真を削除" danger onPress={() => setConfirmDelete(true)} />}
        <Action title="閉じる" secondary disabled={busy} onPress={() => { setSelected(null); setConfirmDelete(false); }} />
      </ScrollView></View></View>
    </Modal>
  </PhotoPage>;
}

export default function PinPhotosScreen() {
  const { pinId } = useLocalSearchParams<{ pinId: string }>();
  if (typeof pinId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pinId)) {
    return <PhotoPage><Text style={styles.error}>ピンが見つかりません。場所を選び直してください。</Text><Action title="ピン一覧へ" onPress={() => router.replace('/photos')} /></PhotoPage>;
  }
  return <PhotoAccess><Gallery key={pinId} pinId={pinId} /></PhotoAccess>;
}
