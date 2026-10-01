import { Redirect, router } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';
import { Button, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthSession } from '../../../auth/session';
import { NewPlacePhotoModal } from '../../../photos/NewPlacePhotoModal';
import PinDetailSheet from './PinDetailSheet';
import TrackActionButton from './TrackActionButton';
import { AccountIcon, FootprintsIcon, ListIcon, PinIcon } from './TrackIcons';
import { PIN_COLOR } from './WalkCanvas';
import ZoomableWalkCanvas from './ZoomableWalkCanvas';
import { usePlacePins } from './usePlacePins';
import { useWalkRecorder } from './useWalkRecorder';

export default function TrackPreview() {
  const { token, user } = useAuthSession();
  if (!token || !user) return <Redirect href="/login" />;
  return <TrackScreen key={user.id} token={token} />;
}

function TrackScreen({ token }: { token: string }) {
  const { user, login, logout } = useAuthSession();
  const recorder = useWalkRecorder(token);
  const placePins = usePlacePins(token);
  const [showPins, setShowPins] = useState(true);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [startNoticeOpen, setStartNoticeOpen] = useState(false);
  const [openPinId, setOpenPinId] = useState<string | null>(null);
  const [navigationMessage, setNavigationMessage] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  usePreventRemove(recorder.locked, () => {
    setNavigationMessage('散歩を終了して保存してから画面を移動してください。');
  });
  useEffect(() => {
    if (Platform.OS !== 'web' || !recorder.locked) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [recorder.locked]);

  const reauthenticate = async () => {
    if (!user || loggingIn) return;
    setLoggingIn(true);
    setLoginError('');
    try {
      await login(user.email, password);
      setPassword('');
      recorder.authenticated();
    } catch (err) { setLoginError(err instanceof Error ? err.message : 'ログインできませんでした。'); }
    finally { setLoggingIn(false); }
  };

  const status = recorder.phase === 'recording'
    ? `記録中：${recorder.count} 点（未保存 ${recorder.pending} 点）`
    : recorder.phase === 'starting' ? '記録を開始しています…'
      : recorder.phase === 'startFailed' ? '開始結果を確認できませんでした。再試行してください。'
        : recorder.phase === 'pending' ? (recorder.busy ? '保存中…' : '保存待ち')
          : '';

  const walking = recorder.phase === 'recording' || recorder.phase === 'pending';
  const mainTitle = recorder.phase === 'pending' ? '記録を保存する'
    : recorder.phase === 'recording' ? '散歩を終える'
      : recorder.phase === 'startFailed' ? '開始を再試行'
        : '足跡を記録する';
  const onMainPress = () => {
    if (walking) { void recorder.finish(); return; }
    // 記録を始めるときだけ、アプリを開いたままにする必要があることを知らせる
    setStartNoticeOpen(true);
    void recorder.start();
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.map}>
        <ZoomableWalkCanvas walks={recorder.walks} current={recorder.current} pins={showPins ? placePins.pins : undefined} onPinPress={pin => setOpenPinId(pin.id)} />
        <View style={styles.account}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="ログイン中のアカウントを確認"
            accessibilityState={{ expanded: accountOpen }}
            onPress={() => setAccountOpen(v => !v)}
            style={({ pressed }) => [styles.accountButton, (pressed || accountOpen) && styles.accountButtonActive]}
          >
            <AccountIcon color="#FFFFFF" />
          </Pressable>
          {accountOpen && (
            <Pressable accessibilityRole="button" accessibilityLabel="アカウント情報を閉じる" onPress={() => setAccountOpen(false)} style={styles.accountCard}>
              <Text style={styles.accountLabel}>ログイン中</Text>
              <Text style={styles.accountName} numberOfLines={1}>{user?.username}</Text>
              <Text style={styles.accountEmail} numberOfLines={1}>{user?.email}</Text>
            </Pressable>
          )}
        </View>
      </View>
      <View style={styles.panel}>
        {recorder.loading && <Text style={styles.info}>履歴を読み込み中…</Text>}
        {!!recorder.historyError && <><Text style={styles.error}>{recorder.historyError}</Text><Button title="履歴を再読み込み" onPress={() => void recorder.reload()} disabled={recorder.loading || recorder.locked || recorder.needsLogin} /></>}
        {!recorder.loading && !recorder.historyError && !recorder.walks.length && recorder.phase === 'idle' && <Text style={styles.info}>まだ散歩の記録がありません</Text>}
        {!!status && <Text style={styles.info} accessibilityLiveRegion="polite">{status}</Text>}
        {recorder.phase === 'recording' && recorder.busy && <Text style={styles.info}>足跡を保存中…</Text>}
        {!!recorder.error && <Text style={styles.error}>{recorder.error}</Text>}
        {!!navigationMessage && recorder.locked && <Text style={styles.info}>{navigationMessage}</Text>}
        {showPins && !!placePins.error && <Text style={styles.error}>{placePins.error}</Text>}
        {recorder.needsLogin ? <>
          <Text style={styles.info}>記録を保持しています。{user?.email} のパスワードで再ログインしてください。</Text>
          <TextInput accessibilityLabel="再ログイン用パスワード" style={styles.input} secureTextEntry value={password} onChangeText={setPassword} autoCapitalize="none" placeholder="パスワード" />
          {!!loginError && <Text style={styles.error}>{loginError}</Text>}
          <Button title="再ログイン" disabled={loggingIn || !password} onPress={() => void reauthenticate()} />
        </> : <>
          <View style={styles.row}>
            <TrackActionButton
              title={mainTitle}
              icon={<FootprintsIcon color="#FFFFFF" />}
              backgroundColor={GREEN}
              textColor="#FFFFFF"
              disabled={recorder.busy}
              onPress={onMainPress}
            />
          </View>
          {recorder.phase === 'recording' && !!recorder.error && <Button title="保存を再試行" disabled={recorder.busy} onPress={() => void recorder.retrySave()} />}
        </>}
        <View style={styles.row}>
          <TrackActionButton
            title="記録を残す"
            icon={<PinIcon color={DARK_TEXT} />}
            backgroundColor={PIN_COLOR}
            textColor={DARK_TEXT}
            disabled={recorder.phase === 'starting' || recorder.phase === 'startFailed' || recorder.needsLogin}
            onPress={() => setPhotoOpen(true)}
          />
          <TrackActionButton
            title={showPins ? '記録を隠す' : '記録を表示'}
            accessibilityLabel={showPins ? '地図上の記録を隠す' : '地図上に記録を表示'}
            icon={<PinIcon color={showPins ? DARK_TEXT : '#666666'} />}
            backgroundColor={showPins ? PIN_COLOR : HIDDEN_GRAY}
            borderColor={PIN_COLOR}
            textColor={showPins ? DARK_TEXT : '#444444'}
            onPress={() => setShowPins(v => !v)}
          />
        </View>
        <View style={styles.row}>
          <TrackActionButton
            compact
            title="記録一覧"
            icon={<ListIcon color={DARK_TEXT} size={18} />}
            backgroundColor={OCHRE}
            textColor={DARK_TEXT}
            disabled={recorder.locked}
            onPress={() => router.push('/photos')}
          />
          <TrackActionButton
            compact
            title="ログアウト"
            backgroundColor={LOGOUT_GRAY}
            textColor="#000000"
            disabled={recorder.locked}
            onPress={() => { logout(); router.replace('/login'); }}
          />
        </View>
      </View>
      <Modal visible={startNoticeOpen} transparent animationType="fade" onRequestClose={() => setStartNoticeOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.dialog} accessibilityViewIsModal>
            <FootprintsIcon color={GREEN} size={32} />
            <Text style={styles.dialogTitle}>足跡の記録を始めます</Text>
            <Text style={styles.dialogBody}>アプリを開いている間に記録します。保存完了まではアプリを終了しないでください。</Text>
            <View style={styles.row}>
              <TrackActionButton title="OK" backgroundColor={GREEN} textColor="#FFFFFF" onPress={() => setStartNoticeOpen(false)} />
            </View>
          </View>
        </View>
      </Modal>
      {openPinId && <PinDetailSheet
        token={token}
        pinId={openPinId}
        canOpenList={!recorder.locked}
        onOpenList={() => { const id = openPinId; setOpenPinId(null); router.push(`/photos/${id}`); }}
        onClose={() => setOpenPinId(null)}
      />}
      {photoOpen && <NewPlacePhotoModal onClose={() => { setPhotoOpen(false); placePins.reload(); }} reauthRequired={recorder.needsLogin} onAuthenticated={recorder.authenticated} />}
    </SafeAreaView>
  );
}

const GREEN = '#2F9E44';
const OCHRE = '#C8963E';
const HIDDEN_GRAY = '#E3E3E3';
const LOGOUT_GRAY = '#D4D4D4';
const DARK_TEXT = '#1F1A10';

const styles = StyleSheet.create({
  root: { flex: 1 },
  map: { flex: 1 },
  account: { position: 'absolute', top: 12, left: 12, alignItems: 'flex-start' },
  accountButton: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  accountButtonActive: { backgroundColor: 'rgba(255, 255, 255, 0.25)' },
  accountCard: {
    marginTop: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12,
    backgroundColor: '#FFFFFF', maxWidth: 260,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  accountLabel: { fontSize: 12, color: '#666' },
  accountName: { fontSize: 16, fontWeight: '700', color: '#111' },
  accountEmail: { fontSize: 13, color: '#444' },
  panel: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  info: { textAlign: 'center' },
  error: { color: '#A12A26', textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#aaa', borderRadius: 8, padding: 10, width: '100%' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 360, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, gap: 12, alignItems: 'center' },
  dialogTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  dialogBody: { fontSize: 14, color: '#333', textAlign: 'center', lineHeight: 20 },
});
