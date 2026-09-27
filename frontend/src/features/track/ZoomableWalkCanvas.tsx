// WalkCanvas にピンチ・ドラッグでの拡大縮小／移動と、操作ボタンを付けたコンポーネント
import { useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import WalkCanvas from "./WalkCanvas";
import type { WalkCanvasProps } from "./WalkCanvas";
import { collectPoints } from "./project";
import { useMapGesture } from "./useMapGesture";

type Props = Omit<WalkCanvasProps, "bounds" | "viewport">;

export default function ZoomableWalkCanvas({ walks, current = null, showPoints }: Props) {
  const points = useMemo(() => collectPoints(walks, current), [walks, current]);
  const viewRef = useRef<View>(null);
  const map = useMapGesture(points, viewRef);

  return (
    <View style={styles.container}>
      <View
        ref={viewRef}
        style={styles.container}
        onLayout={map.onLayout}
        {...map.responderHandlers}
      >
        <WalkCanvas
          walks={walks}
          current={current}
          showPoints={showPoints}
          bounds={map.bounds}
          viewport={map.viewport}
        />
      </View>

      <View style={styles.controls}>
        <MapButton label="＋" accessibilityLabel="拡大" onPress={map.zoomIn} />
        <MapButton label="－" accessibilityLabel="縮小" onPress={map.zoomOut} />
        {!map.isAutoFit && (
          <MapButton label="全体" accessibilityLabel="全体を表示" onPress={map.fitAll} />
        )}
      </View>
    </View>
  );
}

function MapButton({
  label,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  controls: { position: "absolute", top: 12, right: 12, gap: 8 },
  button: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  buttonPressed: { backgroundColor: "rgba(255, 255, 255, 0.25)" },
  buttonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },
});
