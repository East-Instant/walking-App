import type { PropsWithChildren } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function PhotoPage({ children }: PropsWithChildren) {
  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}><View style={styles.content}>{children}</View></ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
export function Action({ title, onPress, disabled, busy, secondary, danger }: { title: string; onPress: () => void; disabled?: boolean; busy?: boolean; secondary?: boolean; danger?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress}
    style={({ pressed }) => [styles.button, secondary && styles.secondary, danger && styles.danger, (pressed || disabled || busy) && { opacity: 0.55 }]}>
    {busy && <ActivityIndicator color={secondary ? '#246B4C' : 'white'} />}<Text style={[styles.buttonText, secondary && { color: '#246B4C' }]}>{title}</Text>
  </Pressable>;
}
export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F6F0' }, page: { flexGrow: 1, padding: 20, alignItems: 'center' },
  content: { width: '100%', maxWidth: 640, gap: 18, paddingVertical: 12 },
  input: { borderWidth: 1, borderColor: '#BBCBBC', borderRadius: 12, padding: 14, color: '#203C2D', backgroundColor: 'white', fontSize: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#203C2D' }, subtitle: { fontSize: 16, fontWeight: '600', color: '#203C2D' },
  body: { color: '#586D5F', fontSize: 14, lineHeight: 23 }, muted: { color: '#66766C', fontSize: 12, lineHeight: 19 },
  card: { backgroundColor: 'white', borderWidth: 1, borderColor: '#DFE7DC', padding: 20, borderRadius: 20, gap: 16 },
  button: { minHeight: 50, padding: 14, backgroundColor: '#246B4C', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  buttonText: { fontWeight: '700', color: 'white', fontSize: 14 }, secondary: { backgroundColor: '#E4EEE5' }, danger: { backgroundColor: '#A53D37' },
  error: { color: '#A53D37', fontSize: 14, lineHeight: 22 }, success: { color: '#246B4C', fontSize: 14, lineHeight: 22 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  preview: { width: '100%', height: 300, borderRadius: 14, backgroundColor: '#E4EAE2' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, tile: { width: '47%', gap: 8 }, thumb: { width: '100%', aspectRatio: 1, borderRadius: 14, backgroundColor: '#E4EAE2', overflow: 'hidden' },
  empty: { paddingVertical: 32, alignItems: 'center', gap: 12 },
  overlay: { flex: 1, padding: 20, backgroundColor: '#10271FEE', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '100%', maxWidth: 700, backgroundColor: '#F3F6F0', borderRadius: 20, padding: 20, gap: 16, maxHeight: '95%' },
});
