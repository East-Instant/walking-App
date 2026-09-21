import { useState } from 'react';
import { Button, Platform, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const apiUrl = (
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000')
).replace(/\/$/, '');

export default function App() {
  const [message, setMessage] = useState('ボタンを押して API 接続を確認できます');
  const [loading, setLoading] = useState(false);

  async function checkApi() {
    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`${apiUrl}/health`, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.status !== 'ok') throw new Error('想定外のレスポンスです');
      setMessage('接続成功：API は正常に動作しています');
    } catch {
      setMessage('接続できません。API の起動と接続先 URL を確認してください。');
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.title}>Walking App</Text>
      <Text>React Native + FastAPI</Text>
      <Text selectable style={styles.url}>{apiUrl}</Text>
      <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>
      <Button title={loading ? '接続確認中…' : 'API 接続を確認'} onPress={checkApi} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5faf7', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  title: { fontSize: 32, fontWeight: '700', color: '#166534' },
  url: { color: '#64748b', textAlign: 'center' },
  message: { textAlign: 'center', lineHeight: 24 },
});
