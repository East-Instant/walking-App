# ピンAPI（PostgreSQL + PostGIS）

認証済みユーザー本人だけがピンを保存・閲覧・更新・削除できます。フロントのログイン・新規登録・足跡・写真画面は同じ認証状態を共有します。

## Dockerで起動

チーム共通の標準環境はDockerです。APIのDB接続設定は `compose.yaml` から渡し、接続先は `db:5432` に統一しています。ルート `.env` の `POSTGRES_PORT` はPC側の公開ポートだけを変更します。`backend/.env` はComposeでは自動読込しません。

1. ルートの `.env.example` を `.env` にコピーし、`SECRET_KEY` をランダムな32文字以上の値に変更します。`python -c "import secrets; print(secrets.token_urlsafe(32))"` で生成できます。サンプルの鍵ではAPIは起動しません。
2. ルートで `docker compose up --build backend` を実行します。
3. `http://localhost:8000/docs` から操作します。

開発用のデモユーザーは、API起動後に次のコマンドで作成できます。何度実行しても重複せず、`APP_ENV=production` では実行を拒否します。

```sh
docker compose exec backend python -m app.scripts.seed_demo_user
```

ログイン名は `demo@example.com` または `demo_walker`、パスワードは `DemoWalk123!` です。

DBは `postgis/postgis:18-3.6`。既存のPostgreSQL 18ボリュームを継続利用します。初回のイメージ切り替え前に重要なデータをバックアップしてください。`down -v` は不要です。公式イメージのamd64版を使うためApple Siliconではエミュレーション動作です。

API起動前に `alembic upgrade head` が実行されます。初回移行では既存の `users` テーブルを保持し、PostGIS拡張と `favorite_pins` を追加します。既存ユーザーテーブルはPR #2の構造が前提です。本番はデプロイ前の単一ジョブで移行し、APIのDBユーザーとDDL実行ユーザーを分離してください。

## ローカル直接起動（必要な場合のみ）

Python 3.12の仮想環境で `pip install -r requirements.txt` を実行し、DBを起動してください。

`backend/.env.example` を `.env` にコピーし、秘密鍵を設定します。`DATABASE_URL` 内のホスト `db` を `localhost` に、ポートをDBの公開ポートに変更してください。`DATABASE_URL` は個別設定より優先されるため、URLを残したまま `POSTGRES_HOST` だけを変更しても反映されません。URLを未設定にする場合は `POSTGRES_HOST=localhost` と `POSTGRES_PORT/USER/PASSWORD/DB` で指定できます。

```sh
# backendディレクトリで実行。dotenvはマイグレーションに明示的に渡します。
python -c "from dotenv import load_dotenv; load_dotenv(); from alembic.config import main; main(argv=['upgrade', 'head'])"
python -m uvicorn app.main:app --env-file .env --reload --no-access-log
```

検索URLには正確な座標が含まれます。リバースプロキシ側もクエリ文字列・Authorizationをログに残さない設定にしてください。本番はHTTPSで提供します。

## 認証とAPI

`POST /auth/register` で登録し、`POST /auth/login` にフォーム形式の `username`（メールまたはニックネーム）と `password` を渡します。返されたトークンを `Authorization: Bearer <token>` に設定します。`/docs` のAuthorizeも利用できます。JWTの有効期限は `ACCESS_TOKEN_EXPIRE_MINUTES`（初期値30分）。

| API | 内容 |
| --- | --- |
| POST /pins | 保存。新規201、同じ内容の再送200 |
| GET /pins | 自分の一覧、新しい順。limit=1〜100、offset=0〜10000 |
| GET /pins?latitude=35&longitude=139&radius_m=500 | 地球表面上の距離で絞り込み。半径は0より大きく最大10000m |
| GET /pins/{id} | 詳細 |
| PATCH /pins/{id} | title/memo/latitude/longitudeの部分更新 |
| DELETE /pins/{id} | 削除、204 |

一覧は `{ "items": [...], "next_offset": 50 }`。次がなければ `null` です。深いページは上限で打ち切ります。更新が同時に発生するとoffset方式では重複・取りこぼしが起こり得るため、大規模利用ではカーソル方式へ移行します。

POST例:

```json
{
  "latitude": 35.6812,
  "longitude": 139.7671,
  "title": "川沿いのベンチ",
  "memo": "夕日がきれい",
  "client_request_id": "c3c9fd9c-7756-44f4-8a8e-fecba9581b01"
}
```

フロントは1回の保存操作につきUUIDを作り、通信再送時に同じIDを使います。同じID・異なる内容は409です。編集後の再送は同じピンの現在の内容を返します。削除後は再送IDの記録も削除されるため、古い保存リクエストを再送すると再作成されます。削除をまたぐ永続的な冪等性は対象外です。

名前は前後空白除去後1〜100文字、メモは最大1000文字。緯度は−90〜90、経度は−180〜180。PATCHの位置変更は緯度・経度をセットで渡します。nullや所有者IDなど未定義項目は422。他人のピンは存在しないピンと同じ404です。

距離検索は `geography(Point,4326)` とGiSTインデックス、`ST_DWithin` を使用します。徒歩経路・所要時間の計算は行いません。接続プールはプロセスあたり通常5、追加5、取得待ち5秒。接続チェックあり、SQL実行上限5秒です。プロセス数×10と管理接続の合計をDB上限内に収めます。最適な設定は負荷試験で調整してください。

## テスト

通常の `python -m pytest -q` では外部DB不要のテストを実行し、DB統合テストはスキップします。統合テストは必ず専用DBを使ってください。各テストに一時スキーマを作成し、終了時にそのスキーマだけを削除します。

```sh
docker run -d --name walking-pin-test --platform linux/amd64 -e POSTGRES_PASSWORD=pin_test_only -e POSTGRES_DB=pin_test -p 127.0.0.1:55432:5432 postgis/postgis:18-3.6
# 起動完了後、backendで実行
TEST_DATABASE_URL=postgresql://postgres:pin_test_only@localhost:55432/pin_test python -m pytest -q
```

API所有権、JWT検証、入力制限、同時再送、距離境界・日付変更線、DB失敗時のロールバックを検証します。マイグレーションも実行します。終了後は専用コンテナを `docker stop walking-pin-test` で停止できます。

写真APIと撮影・表示画面を追加しました。写真の設定とAPIは [PHOTOS.md](PHOTOS.md)、地図担当向けの連携方法は [frontend/photos/README.md](../frontend/photos/README.md) を参照してください。公開共有・GPS取得・地図フロントは対象外です。外部公開時のユーザー/IP単位のレート制限、総保存件数の制限、負荷試験は未実装です。現在の件数・検索半径・DB待機上限は、それらの代替ではありません。
