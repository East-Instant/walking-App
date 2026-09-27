import { AuthSessionProvider } from '../../auth/session';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return <AuthSessionProvider><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false }} /></AuthSessionProvider>;
}
