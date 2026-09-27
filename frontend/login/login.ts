export type LoginValues = { email: string; password: string };
export type LoginErrors = Partial<Record<keyof LoginValues, string>>;

export function validateLogin(values: LoginValues): LoginErrors {
  const errors: LoginErrors = {};
  if (!values.email.trim()) errors.email = 'メールアドレスまたはニックネームを入力してください';
  if (!values.password) errors.password = 'パスワードを入力してください';
  return errors;
}
