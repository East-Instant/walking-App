# ピン写真画面と地図の連携

地図は変更していません。保存済みピンの `id` を渡して写真画面を開きます。

```tsx
import { router } from 'expo-router';

router.push({
  pathname: '/photos/[pinId]',
  params: { pinId: savedPin.id },
});
```

`/photos` は自分の保存済みピン一覧です。新規登録デモ画面の「ピンの写真を見る」からも開けます。ピン作成は地図側またはAPIの `/docs` から行います。

## 認証

写真APIには本物の認証が必要です。既存のデモログインとは独立して、写真画面内のログインフォームから `/auth/login` に接続します。アカウントはAPIの `/auth/register` で登録してください。デモの新規登録フォームはアカウントを作りません。

`PhotoSessionProvider` をアプリのルートに配置しています。トークンはメモリだけに保持し、URL・localStorage・AsyncStorageには保存しません。再起動/リロード後と401時は再ログインが必要です。認証統合時には `usePhotoSession().setToken(accessToken)` で実際のログインAPIのトークンを渡せます。ログアウト時は `setToken(null)` を呼びます。別アカウントに切り替える際も一度nullにして画面の状態を破棄してください。

## 設定と動作

- `EXPO_PUBLIC_API_URL` をAPIのURLに設定します。実機ではPCのLAN内IPを使います。
- Expo ImagePickerで撮影/選択し、ImageManipulatorで長辺1600px以内のJPEGに変換します。24MPを超える元画像は拒否します。HEICなどは端末側でデコードできる場合のみ変換できます。
- プレビューを確認してから保存します。画像加工・保存処理中は操作を抑止します。
- 1回の選択に1つの `client_request_id` を発行し、失敗時の再試行では同じ変換済みファイルとIDを使います。画面を閉じると未送信データは復元しません。
- 写真はBearer付きfetchで取得し、一時的なdata URIで表示します。公開URLや署名トークン入りURLは作りません。
- 拡大表示と削除確認あり。端末の元画像は削除しません。
- 写真の一時変換ファイルはExpoのキャッシュ領域に保存されます。端末OSのキャッシュ管理に従います。
- Webのカメラ操作はブラウザー・端末依存です。実機で撮影/許可拒否/再許可を確認してください。
- iOS/Androidの権限文言を反映するにはアプリの再ビルドが必要です。マイク権限は要求しません。

## API契約

詳細は `backend/PHOTOS.md` を参照してください。送信形式は `multipart/form-data`、フィールドは `file` と `client_request_id`。Content-TypeのboundaryはFormDataに任せます。

実機確認項目: カメラ許可/拒否、写真選択キャンセル、縦横写真の向き、撮影→プレビュー→保存、通信切断後の再送、5枚上限、期限切れ認証、一覧・拡大・削除、地図からのpinId受け渡し。
