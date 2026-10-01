// 散歩の軌跡を SVG で描くコンポーネント
import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";
import { collectPoints, computeBounds, createProjector, toSmoothPathD } from "./project";
import type { Bounds, LatLng } from "./project";
import type { Viewport } from "./viewport";
import type { PlacePin, Walk } from "./types";

export type WalkCanvasProps = {
  walks: Walk[];
  current?: LatLng | null; // 現在地（リアルタイム表示用）
  showPoints?: boolean; // true にすると各座標を点で表示（動作確認用）
  bounds?: Bounds; // 表示の基準にする範囲。省略時は全ての点が収まる範囲を自動計算
  viewport?: Viewport; // 拡大率・移動量。省略時は全体表示
  pins?: PlacePin[]; // 写真を残した場所。渡したものだけをピンで表示
};

const LINE_COLOR = "#39FF14";
const BG_COLOR = "#0E1116";
const PIN_COLOR = "#FFB020";
const NO_PINS: PlacePin[] = []; // 毎回新しい配列にならないよう固定

export default function WalkCanvas({
  walks,
  current = null,
  showPoints = false,
  bounds,
  viewport,
  pins = NO_PINS,
}: WalkCanvasProps) {
  // 親から与えられた実際の描画サイズを取得する
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  // サイズか散歩データ・現在地が変わったときだけ再計算
  const { paths, currentXY, pinXYs } = useMemo(() => {
    // 現在地とピンも範囲計算に含める（精度待ちで points に未反映でも画面内に収まるように）
    const all = collectPoints(walks, current, pins);
    if (size.width === 0 || all.length === 0) return { paths: [], currentXY: null, pinXYs: [] };

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
    const pinXYs = pins.map((pin) => ({ id: pin.id, ...project(pin) }));

    return { paths, currentXY, pinXYs };
  }, [walks, current, pins, size, bounds, viewport]);

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
          {pinXYs.map((p) => (
            <G key={p.id}>
              <Path d={pinShapeD(p.x, p.y)} fill={PIN_COLOR} stroke={BG_COLOR} strokeWidth={1.5} />
              <Circle cx={p.x} cy={p.y - 16} r={3.5} fill={BG_COLOR} />
            </G>
          ))}
        </Svg>
      )}
    </View>
  );
}

/** 先端が (x, y) を指す、しずく形のピン */
function pinShapeD(x: number, y: number): string {
  return `M${x} ${y} C${x - 3} ${y - 6} ${x - 9} ${y - 10} ${x - 9} ${y - 16} A9 9 0 1 1 ${x + 9} ${y - 16} C${x + 9} ${y - 10} ${x + 3} ${y - 6} ${x} ${y} Z`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
});
