import { StyleSheet } from 'react-native';

export const authStyles = StyleSheet.create({
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
