import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '../../api/client';
import { demoAccount, useAuthSession } from '../../auth/session';
import { FormField } from '../components/FormField';
import { validateLogin, type LoginValues } from '../login';
import { authStyles as styles } from '../styles';

const initial: LoginValues = { email: '', password: '' };
const demoEnabled = __DEV__ || process.env.EXPO_PUBLIC_ENABLE_DEMO_ACCOUNT === 'true';

export default function LoginScreen() {
  const { login } = useAuthSession();
  const [values, setValues] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState('');
  const [resetNotice, setResetNotice] = useState(false);
  const pending = useRef(false);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  const errors = submitted ? validateLogin(values) : {};

  function update(key: keyof LoginValues, value: string) {
    setValues((previous) => ({ ...previous, [key]: value }));
    setFailure('');
  }

  async function authenticate(identifier: string, password: string) {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setFailure('');
    try {
      await login(identifier, password);
      if (active.current) router.replace('/track');
    } catch (error) {
      if (!active.current) return;
      setFailure(error instanceof ApiError && error.status === 401
        ? 'メールアドレスまたはニックネーム、パスワードを確認してください。'
        : error instanceof Error ? error.message : 'ログインできませんでした。');
    } finally {
      pending.current = false;
      if (active.current) setLoading(false);
    }
  }

  async function submit() {
    setSubmitted(true);
    if (Object.keys(validateLogin(values)).length) return;
    await authenticate(values.email, values.password);
  }

  async function loginAsDemo() {
    setValues({ email: demoAccount.email, password: demoAccount.password });
    setSubmitted(false);
    await authenticate(demoAccount.email, demoAccount.password);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
          <View style={styles.brand}>
            <View style={styles.mark}><Text style={styles.markText}>↗</Text></View>
            <Text style={styles.brandText}>Walking App</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>A LITTLE WALK, A BETTER DAY</Text>
              <Text accessibilityRole="header" style={styles.title}>おかえりなさい</Text>
              <Text style={styles.subtitle}>今日も、あなたのペースで。</Text>
            </View>
            <View style={styles.form}>
              <FormField label="メールアドレスまたはニックネーム" placeholder="example@email.com" value={values.email} onChangeText={(value) => update('email', value)} error={errors.email} editable={!loading} autoCapitalize="none" autoCorrect={false} autoComplete="username" />
              <FormField label="パスワード" placeholder="パスワードを入力" secret value={values.password} onChangeText={(value) => update('password', value)} error={errors.password} editable={!loading} autoCapitalize="none" autoCorrect={false} autoComplete="current-password" returnKeyType="go" onSubmitEditing={() => { void submit(); }} />
              <Pressable accessibilityRole="button" disabled={loading} onPress={() => setResetNotice(true)} style={[styles.loginLink, { alignSelf: 'flex-end' }]}>
                <Text style={styles.link}>パスワードを忘れた方</Text>
              </Pressable>
              {!!failure && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{failure}</Text>}
              <Pressable accessibilityRole="button" accessibilityState={{ disabled: loading, busy: loading }} disabled={loading} onPress={() => { void submit(); }} style={({ pressed }) => [styles.button, (pressed || loading) && styles.buttonPressed]}>
                {loading && <ActivityIndicator color="#FFFFFF" />}
                <Text style={styles.buttonText}>{loading ? 'ログインしています…' : 'ログイン'}</Text>
              </Pressable>
              {demoEnabled && <View style={{ gap: 6 }}>
                <Text style={styles.hint}>動作確認用</Text>
                <Pressable accessibilityRole="button" accessibilityState={{ disabled: loading }} disabled={loading} onPress={() => { void loginAsDemo(); }} style={({ pressed }) => [styles.button, styles.demoButton, pressed && styles.buttonPressed]}>
                  <Text style={[styles.buttonText, styles.demoButtonText]}>デモアカウントでログイン</Text>
                </Pressable>
                <Text selectable style={styles.hint}>{demoAccount.email} / {demoAccount.username}</Text>
              </View>}
              <View style={styles.login}>
                <Text style={styles.hint}>アカウントをお持ちでない方</Text>
                <Pressable accessibilityRole="button" disabled={loading} onPress={() => router.replace('/')} style={styles.loginLink}><Text style={styles.link}>新規登録</Text></Pressable>
              </View>
            </View>
          </View>
          <Text style={styles.footer}>あなたのペースで、一歩ずつ。</Text>
          <Text style={styles.demo}>ログイン情報はバックエンドで認証されます</Text>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal visible={resetNotice} transparent animationType="fade" onRequestClose={() => setResetNotice(false)}>
        <View style={styles.overlay}><View accessibilityViewIsModal style={styles.modal}>
          <Text accessibilityRole="header" style={styles.modalTitle}>パスワードの再設定</Text>
          <Text style={styles.body}>パスワードの再設定は準備中です。</Text>
          <Pressable accessibilityRole="button" onPress={() => setResetNotice(false)} style={styles.button}><Text style={styles.buttonText}>閉じる</Text></Pressable>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}
