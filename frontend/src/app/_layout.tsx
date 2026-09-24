import { PhotoSessionProvider } from '../../photos/session';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return <PhotoSessionProvider><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false }} /></PhotoSessionProvider>;
}
