import { createContext, useContext, useRef, useState, type PropsWithChildren } from 'react';
import { Text } from 'react-native';
import { FormField } from '../login/components/FormField';
import { request } from './api';
import { Action, PhotoPage, styles } from './ui';

const Context = createContext<{ token: string | null; setToken: (token: string | null) => void } | null>(null);
export function PhotoSessionProvider({ children }: PropsWithChildren) {
  // Kept in memory only; no tokens in URLs, logs, AsyncStorage, or localStorage.
  const [token, setToken] = useState<string | null>(null);
  return <Context.Provider value={{ token, setToken }}>{children}</Context.Provider>;
}
export function usePhotoSession() {
  const session = useContext(Context);
  if (!session) throw new Error('PhotoSessionProvider is required');
  return session;
}
export function PhotoAccess({ children }: PropsWithChildren) {
  const { token, setToken } = usePhotoSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  async function login() {
    if (pending.current) return;
    if (!email.trim() || !password) { setError('メールアドレスとパスワードを入力してください。'); return; }
    pending.current = true; setBusy(true); setError('');
    try {
      const body = new URLSearchParams({ username: email.trim(), password }).toString();
      const response = await request('/auth/login', null, { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      const data: { access_token: string } = await response.json();
      setPassword(''); setToken(data.access_token);
    } catch {
      setError('ログインできませんでした。登録済みの情報と通信環境を確認してください。');
    } finally { pending.current = false; setBusy(false); }
  }
  if (token) return children;
  return <PhotoPage>
    <Text style={styles.muted}>WALKING APP / PHOTOS</Text>
    <Text accessibilityRole="header" style={styles.title}>散歩の思い出を、写真に。</Text>
    <Text style={styles.body}>写真を管理するにはログインしてください。登録済みのアカウントを使用します。</Text>
    <FormField label="メールアドレスまたはニックネーム" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} autoComplete="username" editable={!busy} />
    <FormField label="パスワード" value={password} onChangeText={setPassword} secret autoCapitalize="none" autoCorrect={false} autoComplete="current-password" editable={!busy} onSubmitEditing={() => { void login(); }} />
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Action title={busy ? 'ログイン中…' : 'ログインして写真を見る'} onPress={() => { void login(); }} busy={busy} />
    <Text style={styles.muted}>デモ用ログイン情報は利用できません。アプリを再起動すると再ログインが必要です。</Text>
  </PhotoPage>;
}
