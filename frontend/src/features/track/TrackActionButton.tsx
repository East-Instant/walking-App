// 足跡画面の操作ボタン（色・枠線・アイコンを指定できる）
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  onPress: () => void;
  backgroundColor: string;
  textColor: string;
  borderColor?: string;
  icon?: ReactNode;
  disabled?: boolean;
  accessibilityLabel?: string;
  compact?: boolean; // 補助的なボタン用に高さを抑える
};

export default function TrackActionButton({
  title,
  onPress,
  backgroundColor,
  textColor,
  borderColor,
  icon,
  disabled = false,
  accessibilityLabel,
  compact = false,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        { backgroundColor, borderColor: borderColor ?? backgroundColor },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={[styles.text, compact && styles.compactText, { color: textColor }]} numberOfLines={1}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  compact: { minHeight: 40, borderRadius: 10 },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.45 },
  icon: { marginRight: 6 },
  text: { fontSize: 16, fontWeight: "700" },
  compactText: { fontSize: 14 },
});
