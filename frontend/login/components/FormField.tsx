import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

type Props = TextInputProps & { label: string; error?: string; secret?: boolean };

export function FormField({ label, error, secret, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, focused && styles.focused, !!error && styles.invalid]}>
        <TextInput {...props} accessibilityLabel={label} accessibilityHint={error}
          placeholderTextColor="#8B9891" secureTextEntry={secret && !visible}
          onFocus={() => setFocused(true)} onBlur={(event) => { setFocused(false); props.onBlur?.(event); }} style={styles.input} />
        {secret && <Pressable disabled={props.editable === false} accessibilityRole="button"
          accessibilityLabel={`${label}を${visible ? '隠す' : '表示する'}`} onPress={() => setVisible(!visible)} style={styles.toggle}>
          <Text style={styles.toggleText}>{visible ? '隠す' : '表示'}</Text>
        </Pressable>}
      </View>
      {!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 }, label: { color: '#293E34', fontSize: 14, fontWeight: '600' },
  box: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DCE4DD', borderRadius: 12, backgroundColor: '#FAFCFA' },
  focused: { borderColor: '#287653' }, invalid: { borderColor: '#B24436' },
  input: { flex: 1, minWidth: 0, padding: 15, fontSize: 16, color: '#203C2D', minHeight: 52 },
  toggle: { paddingHorizontal: 15, minHeight: 48, justifyContent: 'center' }, toggleText: { color: '#286C4D', fontSize: 13, fontWeight: '600' },
  error: { color: '#B24436', fontSize: 12, lineHeight: 18 },
});
