# track — 散歩の軌跡表示

`expo-location` で取得した GPS の緯度経度を画面上の座標に変換し、歩いた軌跡を SVG で描く機能です。
ピンチ・ドラッグ・ボタンで地図の拡大縮小と移動ができます。

## 構成

処理を **計算 → 描画 → 操作** の3層に分けています。
下の層ほど React や画面に依存しないため、他の画面や機能から再利用しやすくなっています。

```
TrackPreview.tsx           確認用の画面（散歩の開始／終了）
 ├─ useLiveWalk.ts         GPS から現在地と軌跡の点を受け取る
 └─ ZoomableWalkCanvas.tsx 【操作】地図 + ＋／－／全体ボタン
     ├─ useMapGesture.ts   【操作】ピンチ・ドラッグ・ボタン → 表示状態
     └─ WalkCanvas.tsx     【描画】与えられた表示状態のとおりに軌跡を描く
         ├─ project.ts     【計算】緯度経度 → 画面座標、SVG パス文字列の生成
         └─ viewport.ts    【計算】ズーム倍率・移動量の計算
```

## ファイルごとの役割

### 計算（React に依存しない純粋な関数）

| ファイル | 主な関数・型 | 内容 |
|---|---|---|
| `project.ts` | `LatLng`, `Point`, `Bounds` | 緯度経度、画面座標、表示範囲の型 |
| | `computeBounds(points)` | 全ての点を囲む範囲を求める |
| | `collectPoints(walks, current)` | 全散歩の座標と現在地を1つの配列にまとめる |
| | `createProjector(bounds, width, height, padding, viewport)` | 緯度経度 → 画面の x,y に変換する関数を作る。経度を cos(緯度) で補正し、縦横比を保って中央に収める。`viewport` を渡すとズーム・移動を反映する |
| | `toPathD` / `toSmoothPathD` | 座標列を SVG の `<Path d="...">` 文字列にする（折れ線／なめらかな曲線） |
| `viewport.ts` | `Viewport` | `{ zoom, panX, panY }`。全体表示を `zoom: 1` とした拡大率と、画面上の移動量（px） |
| | `zoomAt(v, factor, focal, w, h)` | 指定した画面上の点（ピンチの中心など）を動かさずに拡大・縮小する。倍率は `MIN_ZOOM`〜`MAX_ZOOM`（0.5〜20）に制限 |
| | `panBy(v, dx, dy)` | 地図を dx, dy だけ移動する |
| | `applyViewport(p, v, w, h)` | 全体表示での座標にズーム・移動を適用する |

### 描画

| ファイル | 内容 |
|---|---|
| `WalkCanvas.tsx` | 散歩の軌跡と現在地を SVG で描くコンポーネント。ズームの状態は持たず、props の `bounds`（基準の範囲）と `viewport`（ズーム・移動）のとおりに描く。どちらも省略すると全体表示になるため、サムネイルなど操作不要な場所でもそのまま使える |

主な props：`walks`（散歩の配列）、`current`（現在地）、`showPoints`（各座標を点で表示する確認用）、`bounds`、`viewport`

### 操作

| ファイル | 内容 |
|---|---|
| `useMapGesture.ts` | タッチ操作とボタン操作を受けて表示状態を管理するフック。1本指で移動、2本指でピンチ拡大・縮小 |
| `ZoomableWalkCanvas.tsx` | `WalkCanvas` にタッチ操作と「＋ / － / 全体」ボタンを付けたコンポーネント。props は `WalkCanvas` と同じ（`bounds` / `viewport` を除く） |

**表示モードについて**

- 何も操作していない間は **自動で全体表示** になります。新しい点が増えるたびに全体が収まるよう調整されます。
- 拡大・移動した時点でその範囲を固定します。歩いても画面が勝手に動きません。
- 「全体」ボタン（操作後にだけ表示）で自動の全体表示に戻ります。
- 座標変換の段階でズームを反映しているため、拡大しても線の太さは変わりません。

### データ取得

| ファイル | 内容 |
|---|---|
| `useLiveWalk.ts` | `useLiveWalk(active)`：`active` が true の間、位置情報の許可を求めて現在地を受け取り続ける。`current`（現在地）は常に更新し、精度が 25m 以内の点だけを `points`（軌跡）に追加する。5m 移動ごと（Android は最短2秒間隔）に通知される |
| `mockWalks.ts` | `Walk` 型（`id`, `startedAt`, `points`）とダミーの過去の散歩データ。本番では API から取得したデータに置き換える |

### 確認用

| ファイル | 内容 |
|---|---|
| `TrackPreview.tsx` | 動作確認用の画面。「散歩を始める」を押すと、過去の散歩（ダミー）に重ねて今歩いている軌跡がリアルタイムで描かれる。`src/app/track.tsx` から表示している |
| `check.ts` | 計算部分の簡易テスト。全ての点が画面内に収まるか、北が上になっているか、ズームの中心が動かないか、倍率が上限で止まるかを確認する |

## 使い方の例

```tsx
// src/app/ の画面から使う場合
import ZoomableWalkCanvas from "../features/track/ZoomableWalkCanvas";
import { useLiveWalk } from "../features/track/useLiveWalk";

const { points, current } = useLiveWalk(isWalking);

<ZoomableWalkCanvas
  walks={[{ id: "live", startedAt, points }]}
  current={current}
/>
```

## 依存パッケージ

- `expo-location`：位置情報の取得
- `react-native-svg`：軌跡の描画

タッチ操作には React Native 標準のレスポンダー機能を使っているため、ジェスチャー用の追加ライブラリは不要です。
