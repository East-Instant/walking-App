import { usePreventRemove } from 'expo-router/react-navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Text, TextInput, View } from 'react-native';
import { useAuthSession } from '../auth/session';
import { CreatePinForm } from './CreatePinForm';
import { Gallery } from './PinPhotosScreen';
import { PhotoSessionBoundary } from './session';
import { Action, PhotoPage, styles } from './ui';

/** Keep this overlay above the mounted recorder so taking a photo never resets a walk. */
export function NewPlacePhotoModal({ onClose, onAuthenticated, reauthRequired = false }: {
  onClose: () => void; onAuthenticated?: () => void; reauthRequired?: boolean;
}) {
  const { user, login } = useAuthSession();
  const [pinId, setPinId] = useState<string | null>(null);
  const [closeBlocked, setCloseBlocked] = useState(false);
  const [expired, setExpired] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [navigationMessage, setNavigationMessage] = useState('');
  const suspended = expired || reauthRequired;
  const onExpired = useCallback(() => setExpired(true), []);
  const session = useMemo(() => ({ onExpired, suspended }), [onExpired, suspended]);
  usePreventRemove(true, () => setNavigationMessage('写真画面の「閉じる」から元の画面に戻れます。'));
  useEffect(() => {
    if (Platform.OS !== 'web' || !closeBlocked) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [closeBlocked]);

  const authenticate = async () => {
    if (!user || loggingIn) return;
    setLoggingIn(true); setError('');
    try {
      await login(user.email, password);
      setPassword(''); setExpired(false); onAuthenticated?.();
    } catch (err) { setError(err instanceof Error ? err.message : 'ログインできませんでした。'); }
    finally { setLoggingIn(false); }
  };
  const close = () => {
    if (!closeBlocked && !loggingIn) onClose();
    else setNavigationMessage('処理中や未保存の写真があります。保存するかキャンセルしてから閉じてください。');
  };

  return <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
    <PhotoSessionBoundary.Provider value={session}>
      {/* Hiding instead of unmounting preserves the request ID and the selected photo. */}
      <View style={{ flex: 1, display: suspended ? 'none' : 'flex' }}>
        {pinId
          ? <Gallery pinId={pinId} onClose={close} onCloseBlockedChange={setCloseBlocked} />
          : <CreatePinForm onSaved={pin => setPinId(pin.id)} onClose={close} onCloseBlockedChange={setCloseBlocked} />}
      </View>
      {suspended && <PhotoPage>
        <Text style={styles.title}>再ログイン</Text>
        <Text style={styles.body}>散歩の記録と選んだ写真を保持しています。{user?.email} のパスワードを入力してください。</Text>
        <TextInput accessibilityLabel="写真を保存するためのパスワード" secureTextEntry autoCapitalize="none" placeholder="パスワード" value={password} onChangeText={setPassword} style={styles.input} />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Action title="再ログインして続ける" busy={loggingIn} disabled={!password} onPress={() => void authenticate()} />
        <Action title="閉じる" secondary disabled={closeBlocked || loggingIn} onPress={close} />
      </PhotoPage>}
      {!!navigationMessage && <View style={{ padding: 12, backgroundColor: '#F3F6F0' }}><Text style={styles.body}>{navigationMessage}</Text></View>}
    </PhotoSessionBoundary.Provider>
  </Modal>;
}
