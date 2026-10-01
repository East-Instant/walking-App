import { Redirect, router } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';
import { Button, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthSession } from '../../../auth/session';
import { NewPlacePhotoModal } from '../../../photos/NewPlacePhotoModal';
import ZoomableWalkCanvas from './ZoomableWalkCanvas';
import { useWalkRecorder } from './useWalkRecorder';

export default function TrackPreview() {
  const { token, user } = useAuthSession();
  if (!token || !user) return <Redirect href="/login" />;
  return <TrackScreen key={user.id} token={token} />;
}

function TrackScreen({ token }: { token: string }) {
  const { user, login, logout } = useAuthSession();
  const recorder = useWalkRecorder(token);
  const [photoOpen, setPhotoOpen] = useState(false);
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
    : recorder.phase === 'starting' ? '散歩を開始しています…'
      : recorder.phase === 'startFailed' ? '開始結果を確認できませんでした。再試行してください。'
        : recorder.phase === 'pending' ? (recorder.busy ? '保存中…' : '保存待ち')
          : '散歩を始めると足跡が記録されます';

  return (
    <SafeAreaView style={styles.root}>
      <ZoomableWalkCanvas walks={recorder.walks} current={recorder.current} />
      <View style={styles.panel}>
        <Text>{user?.username} でログイン中</Text>
        {recorder.loading && <Text>履歴を読み込み中…</Text>}
        {!!recorder.historyError && <><Text style={styles.error}>{recorder.historyError}</Text><Button title="履歴を再読み込み" onPress={() => void recorder.reload()} disabled={recorder.loading || recorder.locked || recorder.needsLogin} /></>}
        {!recorder.loading && !recorder.historyError && !recorder.walks.length && <Text>まだ散歩の記録がありません</Text>}
        <Text accessibilityLiveRegion="polite">{status}</Text>
        {recorder.phase === 'recording' && recorder.busy && <Text>足跡を保存中…</Text>}
        {!!recorder.error && <Text style={styles.error}>{recorder.error}</Text>}
        {!!navigationMessage && recorder.locked && <Text>{navigationMessage}</Text>}
        {recorder.needsLogin ? <>
          <Text>記録を保持しています。{user?.email} のパスワードで再ログインしてください。</Text>
          <TextInput accessibilityLabel="再ログイン用パスワード" style={styles.input} secureTextEntry value={password} onChangeText={setPassword} autoCapitalize="none" placeholder="パスワード" />
          {!!loginError && <Text style={styles.error}>{loginError}</Text>}
          <Button title="再ログイン" disabled={loggingIn || !password} onPress={() => void reauthenticate()} />
        </> : <>
          <Button
            title={recorder.phase === 'pending' ? '記録を保存する' : recorder.phase === 'recording' ? '散歩を終える' : recorder.phase === 'startFailed' ? '開始を再試行' : '散歩を始める'}
            disabled={recorder.busy}
            onPress={() => void (recorder.phase === 'recording' || recorder.phase === 'pending' ? recorder.finish() : recorder.start())}
          />
          {recorder.phase === 'recording' && !!recorder.error && <Button title="保存を再試行" disabled={recorder.busy} onPress={() => void recorder.retrySave()} />}
        </>}
        <Text style={styles.note}>アプリを開いている間に記録します。保存完了まではアプリを終了しないでください。</Text>
        <Button title="この場所に写真を残す" disabled={recorder.phase === 'starting' || recorder.phase === 'startFailed' || recorder.needsLogin} onPress={() => setPhotoOpen(true)} />
        <View style={styles.actions}>
          <Button title="写真を見る" disabled={recorder.locked} onPress={() => router.push('/photos')} />
          <Button title="ログアウト" disabled={recorder.locked} color="#8B3A32" onPress={() => { logout(); router.replace('/login'); }} />
        </View>
      </View>
      {photoOpen && <NewPlacePhotoModal onClose={() => setPhotoOpen(false)} reauthRequired={recorder.needsLogin} onAuthenticated={recorder.authenticated} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  panel: { padding: 16, gap: 8, alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 12 },
  error: { color: '#A12A26' },
  note: { fontSize: 12, color: '#555' },
  input: { borderWidth: 1, borderColor: '#aaa', borderRadius: 8, padding: 10, width: '100%' },
});
