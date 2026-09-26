export type Registration = { nickname: string; email: string; password: string; confirmation: string; agreed: boolean };
export type RegistrationErrors = Partial<Record<keyof Registration, string>>;

export function validateRegistration(values: Registration): RegistrationErrors {
  const errors: RegistrationErrors = {};
  if (!values.nickname.trim()) errors.nickname = 'ニックネームを入力してください';
  else if (values.nickname.trim().length > 30) errors.nickname = '30文字以内で入力してください';
  if (!values.email.trim()) errors.email = 'メールアドレスを入力してください';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'メールアドレスの形式を確認してください';
  if (values.password.length < 8) errors.password = 'パスワードは8文字以上で入力してください';
  if (!values.confirmation) errors.confirmation = '確認用パスワードを入力してください';
  else if (values.password !== values.confirmation) errors.confirmation = 'パスワードが一致していません';
  if (!values.agreed) errors.agreed = '内容を確認し、チェックを入れてください';
  return errors;
}
