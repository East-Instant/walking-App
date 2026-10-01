// 緯度経度 → 画面座標（SVG用）の変換関数
import { applyViewport, DEFAULT_VIEWPORT, type Viewport } from "./viewport";

export type LatLng = { lat: number; lng: number };
export type Point = { x: number; y: number };

export type Bounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

/** 全ての点を囲む範囲（バウンディングボックス）を求める */
export function computeBounds(points: LatLng[]): Bounds {
  if (points.length === 0) {
    throw new Error("computeBounds: points が空です");
  }
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  return { minLat, maxLat, minLng, maxLng };
}

/** 全散歩の座標・現在地・ピンを1つの配列にまとめる（範囲計算用） */
export function collectPoints(
  walks: { points: LatLng[] }[],
  current: LatLng | null = null,
  pins: LatLng[] = []
): LatLng[] {
  return walks.flatMap((w) => w.points).concat(current ? [current] : [], pins);
}

/**
 * 範囲と画面サイズから「緯度経度 → x,y」の変換関数を作る。
 * - 経度は緯度によって1度あたりの距離が縮むので cos(緯度) で補正
 * - 縦横比を保ったまま画面に収め、中央寄せする
 * - 画面の y は下向きなので、緯度（北が上）は反転する
 * - viewport を渡すと、その拡大率・移動量を反映する（線の太さは変わらない）
 */
export function createProjector(
  bounds: Bounds,
  width: number,
  height: number,
  padding = 20,
  viewport: Viewport = DEFAULT_VIEWPORT
): (p: LatLng) => Point {
  const midLat = (bounds.minLat + bounds.maxLat) / 2;
  const cosLat = Math.cos((midLat * Math.PI) / 180);

  // 補正後の範囲（単位は「緯度1度相当」）
  const spanX = (bounds.maxLng - bounds.minLng) * cosLat;
  const spanY = bounds.maxLat - bounds.minLat;

  const drawW = width - padding * 2;
  const drawH = height - padding * 2;

  // 点が1つだけ等で幅0になっても割り算が壊れないようにする
  const scale = Math.min(
    spanX > 0 ? drawW / spanX : Infinity,
    spanY > 0 ? drawH / spanY : Infinity
  );
  const s = Number.isFinite(scale) ? scale : 1;

  // 中央寄せのための余白
  const offsetX = padding + (drawW - spanX * s) / 2;
  const offsetY = padding + (drawH - spanY * s) / 2;

  return (p: LatLng): Point =>
    applyViewport(
      {
        x: offsetX + (p.lng - bounds.minLng) * cosLat * s,
        y: offsetY + (bounds.maxLat - p.lat) * s,
      },
      viewport,
      width,
      height
    );
}

/** 座標列を SVG の <Path d="..."> 文字列に変換する */
export function toPathD(points: LatLng[], project: (p: LatLng) => Point): string {
  return points
    .map((p, i) => {
      const { x, y } = project(p);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

/**
 * 座標列を「なめらかな曲線」の SVG パス文字列に変換する（Catmull-Rom スプライン）。
 * すべての点を通りつつ、角を丸めた曲線になる。
 * smoothness: 0 で折れ線と同じ、1 が標準。大きくするほど丸くなる（上げすぎると膨らむ）
 */
export function toSmoothPathD(
  points: LatLng[],
  project: (p: LatLng) => Point,
  smoothness = 1
): string {
  const pts = points.map(project);
  if (pts.length === 0) return "";
  const f = (n: number) => n.toFixed(1);

  let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]; // 端では自分自身で代用
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const k = smoothness / 6;

    // p1 → p2 を結ぶ3次ベジェ曲線の制御点
    const c1x = p1.x + (p2.x - p0.x) * k;
    const c1y = p1.y + (p2.y - p0.y) * k;
    const c2x = p2.x - (p3.x - p1.x) * k;
    const c2y = p2.y - (p3.y - p1.y) * k;

    d += ` C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return d;
}