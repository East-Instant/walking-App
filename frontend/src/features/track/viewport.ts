// 地図の表示状態（ズーム倍率・移動量）を扱う純粋な関数
import type { Point } from "./project";

/**
 * zoom: 全体表示を 1 とした拡大率
 * panX, panY: 拡大後に画面上で平行移動する量（px）
 */
export type Viewport = { zoom: number; panX: number; panY: number };

export const DEFAULT_VIEWPORT: Viewport = { zoom: 1, panX: 0, panY: 0 };
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 20;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** 全体表示での座標に viewport を適用する（画面中央を基準に拡大してから平行移動） */
export function applyViewport(p: Point, v: Viewport, width: number, height: number): Point {
  const cx = width / 2;
  const cy = height / 2;
  return {
    x: cx + (p.x - cx) * v.zoom + v.panX,
    y: cy + (p.y - cy) * v.zoom + v.panY,
  };
}

/**
 * focal（画面座標）の下にある地点を動かさずに factor 倍ズームする。
 * ピンチの中心や画面中央を focal に渡す。
 */
export function zoomAt(
  v: Viewport,
  factor: number,
  focal: Point,
  width: number,
  height: number
): Viewport {
  const zoom = clamp(v.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  const r = zoom / v.zoom; // 上限・下限で止まったときは実際の倍率で計算する
  const fx = focal.x - width / 2;
  const fy = focal.y - height / 2;
  return {
    zoom,
    panX: fx - (fx - v.panX) * r,
    panY: fy - (fy - v.panY) * r,
  };
}

/** 画面上で dx, dy だけ地図をずらす */
export function panBy(v: Viewport, dx: number, dy: number): Viewport {
  return { ...v, panX: v.panX + dx, panY: v.panY + dy };
}
