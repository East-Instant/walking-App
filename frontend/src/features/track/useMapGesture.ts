// 地図のピンチ（拡大縮小）・ドラッグ（移動）・ボタン操作を受けて、表示状態を管理するフック
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { GestureResponderEvent, LayoutChangeEvent, View } from "react-native";
import { computeBounds } from "./project";
import type { Bounds, LatLng, Point } from "./project";
import { DEFAULT_VIEWPORT, panBy, zoomAt } from "./viewport";
import type { Viewport } from "./viewport";

const BUTTON_ZOOM_FACTOR = 1.5;

// 前回のタッチ位置（指2本のときは2本の中点と指の間隔）
type TouchState = { count: 1 | 2; x: number; y: number; dist: number };

function readTouches(e: GestureResponderEvent): TouchState {
  const t = e.nativeEvent.touches;
  if (t.length >= 2) {
    const [a, b] = t;
    return {
      count: 2,
      x: (a.pageX + b.pageX) / 2,
      y: (a.pageY + b.pageY) / 2,
      dist: Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY),
    };
  }
  const a = t[0] ?? e.nativeEvent; // Web のマウス操作では touches が空のことがある
  return { count: 1, x: a.pageX, y: a.pageY, dist: 0 };
}

/**
 * points: 表示中の全座標（範囲を固定するときに使う）
 * viewRef: 操作を受け付ける View（ピンチ中心を地図内の座標に換算するために位置を測る）
 *
 * 何も操作していない間は「自動で全体表示」。新しい点が増えるたびに全体が収まるよう調整される。
 * ユーザーが拡大・移動した時点でその範囲を固定し、歩いても画面が勝手に動かないようにする。
 * fitAll() で自動の全体表示に戻る。
 */
export function useMapGesture(points: LatLng[], viewRef: RefObject<View | null>) {
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT);
  const [frozenBounds, setFrozenBounds] = useState<Bounds | null>(null);

  const sizeRef = useRef({ width: 0, height: 0 });
  const originRef = useRef({ x: 0, y: 0 }); // 地図の左上の画面上の位置（ピンチ中心の換算用）
  const lastTouchRef = useRef<TouchState | null>(null);
  const pointsRef = useRef(points);
  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  const measureOrigin = () => {
    viewRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
      originRef.current = { x: pageX, y: pageY };
    });
  };

  // 操作を始めた瞬間の範囲で固定する（その時点の自動計算結果と同じなので表示は跳ねない）
  const freeze = () => {
    setFrozenBounds(
      (b) => b ?? (pointsRef.current.length > 0 ? computeBounds(pointsRef.current) : null)
    );
  };

  const zoomAtCenter = (factor: number) => {
    freeze();
    const { width, height } = sizeRef.current;
    const center: Point = { x: width / 2, y: height / 2 };
    setViewport((v) => zoomAt(v, factor, center, width, height));
  };

  const endGesture = () => {
    lastTouchRef.current = null;
  };

  // View に渡すタッチ操作のハンドラ（1本指＝移動、2本指＝ピンチで拡大縮小＋移動）
  const responderHandlers = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => {
      lastTouchRef.current = readTouches(e);
      measureOrigin();
    },
    onResponderMove: (e: GestureResponderEvent) => {
      const now = readTouches(e);
      const last = lastTouchRef.current;
      lastTouchRef.current = now;
      // 指の本数が変わった瞬間は基準を取り直すだけ（表示が跳ねないように）
      if (!last || last.count !== now.count) return;

      const dx = now.x - last.x;
      const dy = now.y - last.y;
      const factor = now.count === 2 && last.dist > 0 ? now.dist / last.dist : 1;
      if (dx === 0 && dy === 0 && factor === 1) return;

      freeze();
      const { width, height } = sizeRef.current;
      const focal: Point = { x: now.x - originRef.current.x, y: now.y - originRef.current.y };
      setViewport((v) => zoomAt(panBy(v, dx, dy), factor, focal, width, height));
    },
    onResponderRelease: endGesture,
    onResponderTerminate: endGesture,
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    sizeRef.current = { width, height };
    measureOrigin();
  };

  return {
    viewport,
    bounds: frozenBounds ?? undefined,
    isAutoFit: frozenBounds === null,
    onLayout,
    responderHandlers,
    zoomIn: () => zoomAtCenter(BUTTON_ZOOM_FACTOR),
    zoomOut: () => zoomAtCenter(1 / BUTTON_ZOOM_FACTOR),
    fitAll: () => {
      setViewport(DEFAULT_VIEWPORT);
      setFrozenBounds(null);
    },
  };
}
