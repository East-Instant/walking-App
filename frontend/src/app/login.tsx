import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormField } from '../components/FormField';
import { demoLogin, loginMock, validateLogin, type LoginValues } from '../features/auth/login';
import { authStyles as styles } from '../features/auth/styles';

const initial: LoginValues = { email: '', password: '' };

export default function LoginScreen() {
  const [values, setValues] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [failure, setFailure] = useState('');
  const [resetNotice, setResetNotice] = useState(false);
  const pending = useRef(false);
  const active = useRef(true);
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  const errors = submitted ? validateLogin(values) : {};

  function update(key: keyof LoginValues, value: string) {
    setValues((previous) => ({ ...previous, [key]: value }));
    setFailure('');
  }

  async function submit() {
    if (pending.current) return;
    setSubmitted(true);
    setFailure('');
    if (Object.keys(validateLogin(values)).length) return;
    pending.current = true;
    setLoading(true);
    try {
      const accepted = await loginMock(values);
      if (!active.current) return;
      if (accepted) {
        setValues(initial);
        setComplete(true);
        scroll.current?.scrollTo({ y: 0, animated: false });
      } else {
        setFailure('メールアドレスまたはパスワードが違います。下記のデモ用情報をご確認ください。');
      }
    } catch {
      if (active.current) setFailure('ログインできませんでした。もう一度お試しください。');
    } finally {
      pending.current = false;
      if (active.current) setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
          <View style={styles.brand}>
            <View style={styles.mark}><Text style={styles.markText}>↗</Text></View>
            <Text style={styles.brandText}>Walking App</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>A LITTLE WALK, A BETTER DAY</Text>
              <Text accessibilityRole="header" style={styles.title}>{complete ? 'ログインできました！' : 'おかえりなさい'}</Text>
              <Text style={styles.subtitle}>今日も、あなたのペースで。</Text>
            </View>
            {complete ? (
              <View style={styles.form}>
                <View style={styles.success}>
                  <Text style={styles.successIcon}>✓</Text>
                  <Text accessibilityLiveRegion="polite" style={styles.successTitle}>ログイン成功（デモ）</Text>
                  <Text style={styles.body}>ログインの操作を体験しました。{ '\n' }実際の認証やログイン状態の保存は行いません。</Text>
                </View>
                <Pressable accessibilityRole="button" style={styles.button} onPress={() => { setComplete(false); setSubmitted(false); setFailure(''); }}>
                  <Text style={styles.buttonText}>ログイン画面に戻る</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.form}>
                <FormField label="メールアドレス" placeholder="example@email.com" value={values.email} onChangeText={(value) => update('email', value)} error={errors.email} editable={!loading} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
                <FormField label="パスワード" placeholder="パスワードを入力" secret value={values.password} onChangeText={(value) => update('password', value)} error={errors.password} editable={!loading} autoCapitalize="none" autoCorrect={false} autoComplete="current-password" returnKeyType="go" onSubmitEditing={() => { void submit(); }} />
                <Pressable accessibilityRole="button" disabled={loading} onPress={() => setResetNotice(true)} style={[styles.loginLink, { alignSelf: 'flex-end' }]}>
                  <Text style={styles.link}>パスワードを忘れた方</Text>
                </Pressable>
                {!!failure && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{failure}</Text>}
                <Pressable accessibilityRole="button" accessibilityState={{ disabled: loading, busy: loading }} disabled={loading} onPress={() => { void submit(); }} style={({ pressed }) => [styles.button, (pressed || loading) && styles.buttonPressed]}>
                  {loading && <ActivityIndicator color="#FFFFFF" />}
                  <Text style={styles.buttonText}>{loading ? 'ログインしています…' : 'ログイン'}</Text>
                </Pressable>
                <View style={{ gap: 6 }}>
                  <Text style={styles.hint}>デモ用ログイン情報</Text>
                  <Text selectable style={styles.body}>{demoLogin.email}{'\n'}パスワード：{demoLogin.password}</Text>
                  <Text style={styles.hint}>新規登録画面で入力した情報は使えません。</Text>
                  <Pressable accessibilityRole="button" disabled={loading} style={styles.loginLink} onPress={() => { setValues({ ...demoLogin }); setFailure(''); setSubmitted(false); }}>
                    <Text style={styles.link}>デモ用情報を入力する</Text>
                  </Pressable>
                </View>
                <View style={styles.login}>
                  <Text style={styles.hint}>アカウントをお持ちでない方</Text>
                  <Pressable accessibilityRole="button" disabled={loading} onPress={() => router.replace('/')} style={styles.loginLink}><Text style={styles.link}>新規登録</Text></Pressable>
                </View>
              </View>
            )}
          </View>
          <Text style={styles.footer}>あなたのペースで、一歩ずつ。</Text>
          <Text style={styles.demo}>デモ画面 · 入力した情報は送信・保存されません</Text>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal visible={resetNotice} transparent animationType="fade" onRequestClose={() => setResetNotice(false)}>
        <View style={styles.overlay}><View accessibilityViewIsModal style={styles.modal}>
          <Text accessibilityRole="header" style={styles.modalTitle}>パスワードの再設定</Text>
          <Text style={styles.body}>パスワードの再設定は準備中です。このデモでは、画面に記載されたデモ用ログイン情報をご利用ください。メールは送信されません。</Text>
          <Pressable accessibilityRole="button" onPress={() => setResetNotice(false)} style={styles.button}><Text style={styles.buttonText}>閉じる</Text></Pressable>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}
