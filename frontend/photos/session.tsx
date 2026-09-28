import { router } from 'expo-router';
import { createContext, useContext, type PropsWithChildren } from 'react';
import { Text } from 'react-native';
import { useAuthSession } from '../auth/session';
import { Action, PhotoPage, styles } from './ui';

// Keep the walk and pending photo mounted when authentication expires in the overlay.
export const PhotoSessionBoundary = createContext<{ onExpired: () => void; suspended: boolean } | null>(null);

export function usePhotoSession() {
  const { token, logout } = useAuthSession();
  const boundary = useContext(PhotoSessionBoundary);
  return { token, logout: boundary?.onExpired ?? logout, suspended: boundary?.suspended ?? false };
}
export function PhotoAccess({ children }: PropsWithChildren) {
  const { token } = useAuthSession();
  if (token) return children;
  return <PhotoPage>
    <Text style={styles.muted}>WALKING APP / PHOTOS</Text>
    <Text accessibilityRole="header" style={styles.title}>散歩の思い出を、写真に。</Text>
    <Text style={styles.body}>写真を管理するにはログインしてください。デモアカウントも利用できます。</Text>
    <Action title="ログイン画面へ" onPress={() => router.replace('/login')} />
  </PhotoPage>;
}
