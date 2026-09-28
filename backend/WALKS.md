# 散歩の足跡API

共通のBearer認証を使用し、自分の散歩だけを取得・変更できます。
フロントは `EXPO_PUBLIC_API_URL` と既存のログイントークンで接続します。

## DB移行

API起動時の `metadata.create_all()` を廃止し、Alembicで管理します。
新規環境にも、旧APIが `walk_logs` / `location_points` を作成済みの環境にも対応します。
`004_walk_sync` は既存の散歩と座標を残し、開始リクエストIDと座標の連番を追加します。
過去の座標は `recorded_at, id` 順に採番します。同時刻の旧データの実際の歩行順は復元できません。

ローカルでは、DB接続環境変数を設定したうえで `backend` から実行します。

```sh
.venv/bin/alembic upgrade head
```

Dockerではマイグレーションをイメージに含めるため、更新後に再ビルドしてください。
起動コマンドが `alembic upgrade head` を実行します。

```sh
docker compose up -d --build backend
```

## API契約

初期の散歩APIからリクエスト必須項目を追加しています。フロントとAPIを同時に更新してください。

- `POST /walks/start`: `{"client_request_id":"UUID"}`。同一ユーザー・同一IDの再試行は同じ散歩を返します（201）。
- `GET /walks/me`: 開始日時の新しい順に散歩一覧を返します。各 `locations` は連番順です。
- `POST /walks/{id}/locations`: 下記形式で1〜500点を追加します。緯度±90・経度±180、連番は0以上の整数、取得時刻はタイムゾーン必須です。
- `POST /walks/{id}/finish`: `{"ended_at":"2026-09-28T01:30:00Z"}`。最初の終了時刻を保持し、再試行で変更しません。端末の時計ずれに備え、サーバー開始〜現在の範囲に補正します。

```json
{
  "locations": [
    {"sequence": 0, "latitude": 35.6812, "longitude": 139.7671, "recorded_at": "2026-09-28T01:00:00Z"}
  ]
}
```

散歩レスポンスは `id`, `user_id`, `started_at`, `ended_at`, `locations` を含みます。
各座標には `id`, `sequence`, `latitude`, `longitude`, `recorded_at` があります。

同じ連番・同じ内容の再送は成功し、重複保存しません。同じ連番で内容が違う場合は409です。
終了済みの散歩への新しい座標追加は409です（保存済みの座標の再送は成功）。
座標送信と終了処理は散歩の行ロックで直列化し、1バッチの途中で不正があれば全体をロールバックします。
認証エラーは401、他ユーザーまたは存在しない散歩は404、不正な入力は422です。

## テスト

`TEST_DATABASE_URL` に専用のPostGISテストDBを設定し、`backend` で `.venv/bin/python -m pytest -q` を実行します。
各テストは独立した一時スキーマ内で実マイグレーション・APIを検証します。
DB変数が未設定だと統合テストはスキップされます。

初回の履歴APIは全件取得です。長期間の運用に向けたページング・軌跡の間引き、
バックグラウンド記録、アプリ強制終了後の未送信データ復元は今回の対象外です。
