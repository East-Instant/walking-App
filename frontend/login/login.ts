export type LoginValues = { email: string; password: string };
export type LoginErrors = Partial<Record<keyof LoginValues, string>>;

// 公開されたデモ用の値。実際の認証情報ではない。
export const demoLogin = { email: 'demo@example.com', password: 'walking123' };

export function validateLogin(values: LoginValues): LoginErrors {
  const errors: LoginErrors = {};
  if (!values.email.trim()) errors.email = 'メールアドレスを入力してください';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'メールアドレスの形式を確認してください';
  if (!values.password) errors.password = 'パスワードを入力してください';
  return errors;
}

// API やストレージを使わず、成功・失敗の表示だけを再現する。
export async function loginMock(values: LoginValues): Promise<boolean> {
  await new Promise<void>((resolve) => setTimeout(resolve, 800));
  return values.email.trim().toLowerCase() === demoLogin.email && values.password === demoLogin.password;
}
