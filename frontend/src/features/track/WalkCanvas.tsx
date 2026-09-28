// 散歩の軌跡を SVG で描くコンポーネント
import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { collectPoints, computeBounds, createProjector, toSmoothPathD } from "./project";
import type { Bounds, LatLng } from "./project";
import type { Viewport } from "./viewport";
import type { Walk } from "./types";

export type WalkCanvasProps = {
  walks: Walk[];
  current?: LatLng | null; // 現在地（リアルタイム表示用）
  showPoints?: boolean; // true にすると各座標を点で表示（動作確認用）
  bounds?: Bounds; // 表示の基準にする範囲。省略時は全ての点が収まる範囲を自動計算
  viewport?: Viewport; // 拡大率・移動量。省略時は全体表示
};

const LINE_COLOR = "#39FF14";
const BG_COLOR = "#0E1116";

export default function WalkCanvas({
  walks,
  current = null,
  showPoints = false,
  bounds,
  viewport,
}: WalkCanvasProps) {
  // 親から与えられた実際の描画サイズを取得する
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  // サイズか散歩データ・現在地が変わったときだけ再計算
  const { paths, currentXY } = useMemo(() => {
    // 現在地も範囲計算に含める（精度待ちで points に未反映でも画面内に収まるように）
    const all = collectPoints(walks, current);
    if (size.width === 0 || all.length === 0) return { paths: [], currentXY: null };

    // 全散歩をまとめた範囲で1つの変換関数を作る → 同じキャンバスに重なる
    const project = createProjector(
      bounds ?? computeBounds(all),
      size.width,
      size.height,
      24,
      viewport
    );

    const paths = walks
      .filter((w) => w.points.length > 0)
      .map((w) => ({
        id: w.id,
        d: toSmoothPathD(w.points, project),
        dots: w.points.map(project),
      }));

    const currentXY = current ? project(current) : null;

    return { paths, currentXY };
  }, [walks, current, size, bounds, viewport]);

  return (
    <View style={styles.container} onLayout={onLayout}>
      {size.width > 0 && (
        <Svg width={size.width} height={size.height}>
          {paths.map((p) => (
            <Path
              key={p.id}
              d={p.d}
              stroke={LINE_COLOR}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={0.8}
              fill="none"
            />
          ))}
          {showPoints &&
            paths.flatMap((p) =>
              p.dots.map((pt, i) => (
                <Circle key={`${p.id}-${i}`} cx={pt.x} cy={pt.y} r={3} fill="#E04F5F" />
              ))
            )}
            {currentXY && <Circle cx={currentXY.x} cy={currentXY.y} r={6} fill="#FFFFFF" stroke={LINE_COLOR} strokeWidth={3} />}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
});
