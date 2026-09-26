# ピン写真API

`003_photos` マイグレーションで写真管理テーブルとファイル削除キューを追加します。依存追加後は `pip install -r requirements.txt`、DBは `alembic upgrade head`。Dockerでは `docker compose up --build backend` で適用されます。

## 保存先

Dockerでは `photo_data` ボリューム、API内では `/data/photos`。ローカルの初期値は `backend/data/photos` です。`PHOTO_STORAGE_DIR` で変更できます。Git管理対象外、静的配信も行いません。DBと写真ボリュームは両方バックアップしてください。複数サーバーで動かす場合は共有ストレージかオブジェクトストレージ実装が必要です。

## エンドポイント

すべて `Authorization: Bearer <access_token>` が必要です。他人のピン・写真は404、未認証は401です。

| API | 動作 |
| --- | --- |
| POST /pins/{pin_id}/photos | multipart形式で写真を保存 |
| GET /pins/{pin_id}/photos | 写真管理情報の配列（最大5件） |
| GET /pins/{pin_id}/photos/{photo_id} | 認証後にJPEGデータを返す |
| DELETE /pins/{pin_id}/photos/{photo_id} | 削除（204） |

POSTのフィールドは `file`（画像ファイル）と `client_request_id`（UUID）です。新規保存201、同じID・同じ元データの再送200、同じIDで別のデータは409。削除後のID再利用は新規保存になります。

レスポンス例:

```json
{
  "id": "036b9279-e868-485f-aaee-0811a3442c7b",
  "pin_id": "73f0a2d7-6f8e-46ae-8283-03d2b6a08047",
  "width": 1200,
  "height": 1600,
  "byte_size": 245321,
  "created_at": "2026-09-24T03:00:00Z"
}
```

保存キー・サーバーのファイルパスは返しません。画像取得レスポンスは `Cache-Control: no-store` と `X-Content-Type-Options: nosniff` を設定します。

## 制限と画像処理

- 1ピン最大5枚。ピンの行ロックにより同時アップロードでも上限を守ります。
- 画像本体最大10MiB（画面では10MBと表記）、リクエスト全体は10MiB+64KiB。Content-Lengthだけに頼らず、multipart解析前に読み取り量を制限します。
- JPEG/PNG/WebPの実データだけを受け入れます。SVG、GIF、動画、アニメーション画像は対象外です。元画像の最大解像度は2400万画素。
- EXIFの向きを反映し、長辺1600px以内に縮小。新しいRGB画像からJPEGを再生成し、GPS/EXIF/XMP/ICC等のメタデータと元ファイル名を保存しません。
- 容量・解像度超過413、不正/未対応画像415、必須項目・UUID不正422、枚数上限409、保存領域の障害503。
- 権限確認は画像処理前、保存時にも所有権を確認します。DBとファイルを公開ディレクトリに配置しないでください。

## ファイル削除と障害復旧

写真やピンの削除時は、写真レコード削除と同じDBトランザクションで `photo_deletions` に記録します。削除済みの写真は即座にAPIから参照できなくなります。ファイル削除に失敗してもキューに残り、次のコマンドで再試行できます（1回最大100件）。

```sh
python -m app.photos.cleanup
# 24時間以上経った未参照ファイルも削除する場合
python -m app.photos.cleanup --orphans
```

APIと同じDB・保存先環境変数を読み込んで実行してください。Dockerでは `docker compose exec backend python -m app.photos.cleanup --orphans`。開発環境では適宜、本番では定期ジョブとして実行します。移行ダウングレードで管理テーブルを消す前に、必要な写真を退避してください。

DBコミット時の通信障害では保存の成否が不明な場合があります。その場合は有効な写真を誤って消さないようファイルを残します。24時間の猶予を過ぎた未参照ファイルは保守コマンドで削除します。写真管理を伴わないユーザーの直接DB削除でも未参照ファイルが残るため、この保守処理が必要です。

本番用のレート制限、利用者ごとの総容量上限、監視、ストレージの暗号化・バックアップ運用は別途必要です。

## 検証

`TEST_DATABASE_URL` に専用PostGISを指定して `python -m pytest -q`。写真ファイルは各テストの一時ディレクトリだけを使います。テストには実画像の再エンコード・メタデータ除去・所有権・同時再送/枚数制限・削除失敗時のキュー・未参照ファイルの清掃を含みます。

検証結果（2026-09-24）: 専用PostgreSQL 18/PostGIS環境でバックエンド25テスト成功。フロントはTypeScript・lint・Web/iOS/Android向けバンドル生成成功。実機のカメラ、権限ダイアログ、画面操作の通し確認は未実施です。
