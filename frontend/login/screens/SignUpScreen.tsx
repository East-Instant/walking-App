import { router } from 'expo-router';
import { authStyles as styles } from '../styles';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormField } from '../components/FormField';
import { registerMock, validateRegistration, type Registration, type RegistrationErrors } from '../registration';

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
              <Pressable accessibilityRole="button" style={styles.loginLink} onPress={() => router.replace('/login')}><Text style={styles.link}>ログインへ進む</Text></Pressable>
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
              <View style={styles.login}><Text style={styles.hint}>すでにアカウントをお持ちの方</Text><Pressable accessibilityRole="button" disabled={loading} onPress={() => router.replace('/login')} style={styles.loginLink}><Text style={styles.link}>ログイン</Text></Pressable></View>
            </View>}
          </View>
          <Pressable accessibilityRole="button" style={styles.loginLink} disabled={loading} onPress={() => router.push('/photos')}><Text style={styles.link}>ピンの写真を見る</Text></Pressable>
          <Text style={styles.footer}>あなたのペースで、一歩ずつ。</Text>
          <Text style={styles.demo}>デモ画面 · 入力した情報は送信・保存されません</Text>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal visible={notice !== null} transparent animationType="fade" onRequestClose={() => setNotice(null)}>
        <View style={styles.overlay}><View accessibilityViewIsModal style={styles.modal}>
          <Text accessibilityRole="header" style={styles.modalTitle}>{notice}</Text>
          <Text style={styles.body}>{'正式な文面は準備中です。このデモでのチェックは操作確認用で、実際の規約への同意にはなりません。入力した情報は送信・保存されません。'}</Text>
          <Pressable accessibilityRole="button" onPress={() => setNotice(null)} style={styles.button}><Text style={styles.buttonText}>閉じる</Text></Pressable>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}
