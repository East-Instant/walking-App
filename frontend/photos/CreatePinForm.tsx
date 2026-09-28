import { randomUUID } from 'expo-crypto';
import { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { ApiError, createPin, type Pin } from './api';
import { locatePin } from './location';
import { makePinDraft, type PinCreate, type PinLocation } from './pinDraft';
import { usePhotoSession } from './session';
import { Action, PhotoPage, styles } from './ui';

export function CreatePinForm({ onSaved, onClose, onCloseBlockedChange }: {
  onSaved: (pin: Pin) => void; onClose: () => void; onCloseBlockedChange: (blocked: boolean) => void;
}) {
  const { token, logout } = usePhotoSession();
  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  const [location, setLocation] = useState<PinLocation | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState<'location' | 'save' | null>(null);
  const [error, setError] = useState('');
  const request = useRef<Readonly<PinCreate> | null>(null);
  const working = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => { onCloseBlockedChange(busy !== null); return () => onCloseBlockedChange(false); }, [busy, onCloseBlockedChange]);

  const locate = async () => {
    if (working.current || submitted) return;
    working.current = true; setBusy('location'); setError(''); setLocation(null);
    try {
      const position = await locatePin();
      if (active.current) setLocation(position);
    } catch (err) {
      if (active.current) setError(err instanceof Error ? err.message : '現在地を取得できませんでした。');
    } finally { working.current = false; if (active.current) setBusy(null); }
  };

  const save = async () => {
    if (working.current || !location || !token) return;
    working.current = true; setBusy('save'); setError('');
    try {
      // Freeze coordinates, text and ID across timeouts and reauthentication.
      request.current ??= makePinDraft(location, title, memo, randomUUID());
      setSubmitted(true);
      const pin = await createPin(token, request.current);
      if (active.current) onSaved(pin);
    } catch (err) {
      if (!active.current) return;
      if (err instanceof ApiError && err.status === 401) logout();
      else setError(err instanceof Error ? err.message : '場所を保存できませんでした。');
    } finally { working.current = false; if (active.current) setBusy(null); }
  };

  return <PhotoPage>
    <Action title="閉じる" secondary disabled={busy !== null} onPress={onClose} />
    <Text accessibilityRole="header" style={styles.title}>この場所に写真を残す</Text>
    <Text style={styles.body}>現在地と場所の名前を保存すると、写真を撮ったり選んだりできます。</Text>
    <View style={styles.card}>
      <Text style={styles.subtitle}>1. 場所を確認</Text>
      <Action title={busy === 'location' ? '現在地を取得中…' : location ? '現在地を取得し直す' : '現在地を取得'} busy={busy === 'location'} disabled={busy !== null || submitted} onPress={() => void locate()} />
      {location && <Text style={styles.body}>現在地を取得しました（精度の目安：約{Math.round(location.accuracy)}m）。この位置を保存します。</Text>}
      <Text style={styles.muted}>位置情報が使えない場合も、保存済みの場所には写真を追加できます。</Text>
    </View>
    <View style={styles.card}>
      <Text style={styles.subtitle}>2. 名前をつける</Text>
      <TextInput accessibilityLabel="場所の名前" placeholder="例：川沿いのベンチ" maxLength={100} value={title} onChangeText={setTitle} editable={!submitted && busy === null} style={styles.input} />
      <TextInput accessibilityLabel="場所のメモ（任意）" placeholder="メモ（任意）" multiline maxLength={1000} value={memo} onChangeText={setMemo} editable={!submitted && busy === null} style={[styles.input, { minHeight: 80 }]} />
    </View>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {submitted && !busy && <Text style={styles.body}>同じ内容で保存を再試行できます。保存済みの場合はその場所を開きます。</Text>}
    <Action title={busy === 'save' ? '場所を保存中…' : submitted ? '保存を再試行して写真へ' : '場所を保存して写真へ'} busy={busy === 'save'} disabled={busy !== null || !location || !title.trim()} onPress={() => void save()} />
    <Text style={styles.muted}>場所だけを保存して、写真をあとから追加することもできます。</Text>
  </PhotoPage>;
}
