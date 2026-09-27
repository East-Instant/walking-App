import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { request } from '../api/client';

export type AuthUser = { id: string; username: string; email: string };
type RegistrationRequest = {
  username: string;
  email: string;
  password: string;
  passwordConfirm: string;
  termsAccepted: boolean;
};
type AuthSession = {
  token: string | null;
  user: AuthUser | null;
  login: (identifier: string, password: string) => Promise<void>;
  register: (values: RegistrationRequest) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthSession | null>(null);

export const demoAccount = {
  username: 'demo_walker',
  email: 'demo@example.com',
  password: 'DemoWalk123!',
} as const;

export function AuthSessionProvider({ children }: PropsWithChildren) {
  // アクセストークンは端末の通常ストレージへ保存せず、アプリのメモリだけで保持する。
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = useCallback(async (identifier: string, password: string) => {
    const body = new URLSearchParams({ username: identifier.trim(), password }).toString();
    const loginResponse = await request('/auth/login', null, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const credentials: { access_token: string } = await loginResponse.json();
    const meResponse = await request('/auth/me', credentials.access_token);
    const currentUser: AuthUser = await meResponse.json();
    setUser(currentUser);
    setToken(credentials.access_token);
  }, []);

  const register = useCallback(async (values: RegistrationRequest) => {
    await request('/auth/register', null, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: values.username.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        password_confirm: values.passwordConfirm,
        terms_accepted: values.termsAccepted,
      }),
    });
    await login(values.email, values.password);
  }, [login]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ token, user, login, register, logout }), [token, user, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthSession() {
  const session = useContext(AuthContext);
  if (!session) throw new Error('AuthSessionProvider is required');
  return session;
}
