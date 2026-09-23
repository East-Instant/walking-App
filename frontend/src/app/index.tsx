import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormField } from '../components/FormField';
import { registerMock, validateRegistration, type Registration, type RegistrationErrors } from '../features/auth/registration';

const initial: Registration = { nickname: '', email: '', password: '', confirmation: '', agreed: false };

export default function SignUpScreen() {
  const [values, setValues] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const pending = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const errors: RegistrationErrors = submitted ? validateRegistration(values) : {};
  function update<K extends keyof Registration>(key: K, value: Registration[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }
  async function submit() {
    if (pending.current) return;
    setSubmitted(true);
    if (Object.keys(validateRegistration(values)).length) return;
    pending.current = true;
    setLoading(true);
    try {
      await registerMock();
      setValues(initial);
      setComplete(true);
      scroll.current?.scrollTo({ y: 0, animated: false });
    } finally { pending.current = false; setLoading(false); }
  }
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
          <View style={styles.brand}><View style={styles.mark}><Text style={styles.markText}>↗</Text></View><Text style={styles.brandText}>Walking App</Text></View>
          <View style={styles.card}>
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>A LITTLE WALK, A BETTER DAY</Text>
              <Text accessibilityRole="header" style={styles.title}>{complete ? '準備ができました！' : 'アカウントを作成'}</Text>
              <Text style={styles.subtitle}>{complete ? '新しい一歩を、ここから。' : '毎日の散歩を、もっと楽しく。'}</Text>
            </View>
            {complete ? <View style={styles.form}>
              <View style={styles.success}><Text style={styles.successIcon}>✓</Text><Text accessibilityLiveRegion="polite" style={styles.successTitle}>登録完了（デモ）</Text><Text style={styles.body}>新規登録の操作を体験しました。{ '\n' }アカウントは作成されていません。</Text></View>
              <Pressable accessibilityRole="button" style={styles.button} onPress={() => { setComplete(false); setSubmitted(false); }}><Text style={styles.buttonText}>登録画面に戻る</Text></Pressable>
            </View> : <View style={styles.form}>
              <FormField label="ニックネーム" placeholder="例：さんぽ太郎" value={values.nickname} onChangeText={(v) => update('nickname', v)} error={errors.nickname} editable={!loading} autoComplete="nickname" />
              <FormField label="メールアドレス" placeholder="example@email.com" value={values.email} onChangeText={(v) => update('email', v)} error={errors.email} editable={!loading} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
              <View style={styles.password}><FormField label="パスワード" placeholder="8文字以上で入力" secret value={values.password} onChangeText={(v) => update('password', v)} error={errors.password} editable={!loading} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" /><Text style={styles.hint}>8文字以上で設定してください</Text></View>
              <FormField label="パスワード（確認）" placeholder="もう一度入力してください" secret value={values.confirmation} onChangeText={(v) => update('confirmation', v)} error={errors.confirmation} editable={!loading} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" onSubmitEditing={() => { void submit(); }} returnKeyType="done" />
              <View>
                <View style={styles.consent}>
                  <Pressable accessibilityRole="checkbox" accessibilityLabel="利用規約・プライバシーポリシーへの同意" accessibilityState={{ checked: values.agreed, disabled: loading }} disabled={loading} onPress={() => update('agreed', !values.agreed)} style={styles.checkTarget}><View style={[styles.checkbox, values.agreed && styles.checked]}><Text style={styles.check}>{values.agreed ? '✓' : ''}</Text></View></Pressable>
                  <View style={styles.consentCopy}><View style={styles.links}><Pressable accessibilityRole="button" onPress={() => setNotice('利用規約')} style={styles.textLink}><Text style={styles.link}>利用規約</Text></Pressable><Text style={styles.body}>・</Text><Pressable accessibilityRole="button" onPress={() => setNotice('プライバシーポリシー')} style={styles.textLink}><Text style={styles.link}>プライバシーポリシー</Text></Pressable></View><Text style={styles.body}>を確認し、同意します</Text></View>
                </View>
                {!!errors.agreed && <Text accessibilityLiveRegion="polite" style={styles.error}>{errors.agreed}</Text>}
              </View>
              <Pressable accessibilityRole="button" accessibilityState={{ disabled: loading, busy: loading }} disabled={loading} onPress={() => { void submit(); }} style={({ pressed }) => [styles.button, (pressed || loading) && styles.buttonPressed]}>
                {loading && <ActivityIndicator color="#FFFFFF" />}<Text style={styles.buttonText}>{loading ? '登録しています…' : '新規登録する'}</Text>{!loading && <Text style={styles.arrow}>→</Text>}
              </Pressable>
              <View style={styles.login}><Text style={styles.hint}>すでにアカウントをお持ちの方</Text><Pressable accessibilityRole="button" onPress={() => setNotice('ログイン')} style={styles.loginLink}><Text style={styles.link}>ログイン</Text></Pressable></View>
            </View>}
          </View>
          <Text style={styles.footer}>あなたのペースで、一歩ずつ。</Text>
          <Text style={styles.demo}>デモ画面 · 入力した情報は送信・保存されません</Text>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal visible={notice !== null} transparent animationType="fade" onRequestClose={() => setNotice(null)}>
        <View style={styles.overlay}><View accessibilityViewIsModal style={styles.modal}>
          <Text accessibilityRole="header" style={styles.modalTitle}>{notice}</Text>
          <Text style={styles.body}>{notice === 'ログイン' ? 'ログイン機能は準備中です。現在は新規登録フォームのデモをご利用いただけます。' : '正式な文面は準備中です。このデモでのチェックは操作確認用で、実際の規約への同意にはなりません。入力した情報は送信・保存されません。'}</Text>
          <Pressable accessibilityRole="button" onPress={() => setNotice(null)} style={styles.button}><Text style={styles.buttonText}>閉じる</Text></Pressable>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F6F0' }, fill: { flex: 1 },
  page: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 32 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 26 },
  mark: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#246B4C', alignItems: 'center', justifyContent: 'center' },
  markText: { color: '#FFFFFF', fontSize: 25 }, brandText: { fontSize: 20, fontWeight: '700', color: '#264735', letterSpacing: -0.5 },
  card: { width: '100%', maxWidth: 460, backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#E3E9DF', overflow: 'hidden' },
  hero: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 30, paddingBottom: 26, gap: 10 },
  eyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8, color: '#60816B' },
  title: { fontSize: 26, fontWeight: '700', color: '#203C2D', textAlign: 'center' }, subtitle: { fontSize: 14, color: '#758278', lineHeight: 22 },
  form: { paddingHorizontal: 24, paddingBottom: 26, gap: 19 }, password: { gap: 6 },
  hint: { fontSize: 12, color: '#718076', lineHeight: 19 }, body: { fontSize: 12, color: '#586D5F', lineHeight: 22 },
  consent: { flexDirection: 'row', alignItems: 'center' }, consentCopy: { flex: 1 },
  checkTarget: { minWidth: 44, minHeight: 48, justifyContent: 'center' }, checkbox: { width: 22, height: 22, borderWidth: 1, borderColor: '#A2B3A6', borderRadius: 6, alignItems: 'center', justifyContent: 'center' }, checked: { backgroundColor: '#246B4C', borderColor: '#246B4C' }, check: { color: '#FFFFFF', fontWeight: '700' },
  links: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }, textLink: { paddingVertical: 4 }, link: { color: '#246B4C', fontSize: 12, fontWeight: '600', textDecorationLine: 'underline', lineHeight: 20 },
  button: { minHeight: 54, borderRadius: 12, backgroundColor: '#246B4C', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 14, gap: 10 }, buttonPressed: { opacity: 0.7 },
  buttonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' }, arrow: { color: '#D7E9DC', fontSize: 19 },
  login: { alignItems: 'center', borderTopWidth: 1, borderTopColor: '#EDF0EB', paddingTop: 19 }, loginLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 20 },
  footer: { color: '#758A78', fontSize: 12, marginTop: 24, letterSpacing: 1 }, demo: { fontSize: 10, color: '#738176', textAlign: 'center', marginTop: 10, lineHeight: 18 },
  error: { color: '#B24436', fontSize: 12, lineHeight: 18 }, success: { alignItems: 'center', gap: 16, paddingVertical: 24 }, successIcon: { color: '#246B4C', fontSize: 40 }, successTitle: { fontSize: 20, fontWeight: '700', color: '#246B4C' },
  overlay: { flex: 1, backgroundColor: '#132B2066', justifyContent: 'center', alignItems: 'center', padding: 24 }, modal: { width: '100%', maxWidth: 400, padding: 24, borderRadius: 20, backgroundColor: '#FFFFFF', gap: 24 }, modalTitle: { fontSize: 20, fontWeight: '700', color: '#203C2D' },
});
