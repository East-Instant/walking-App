# Walking App

散歩のルートをGPSで記録し、立ち寄った場所をピンと写真で地図に残すアプリです。
React Native（Expo）のアプリと FastAPI のバックエンドで構成し、Web版とスマホ（Expo Go）で動作します。

## 主な機能

- **新規登録・ログイン**：メールアドレスまたはニックネームとパスワードで認証します（JWT）。
- **散歩の記録**：GPSで歩いた軌跡を描画し、記録中も定期的にサーバーへ保存します。過去の散歩も表示できます。
- **場所の保存（ピン）**：現在地に名前とメモを付けて保存します。足跡の地図上にも表示します。
- **写真**：保存した場所に、カメラまたは写真ライブラリから写真を追加します（1か所につき最大5枚）。

データはログイン中のユーザー本人だけが閲覧・変更できます。

## 技術スタック

| 層 | 技術 |
| --- | --- |
| フロントエンド | React Native 0.86 / Expo SDK 57 / Expo Router / TypeScript |
| バックエンド | Python 3.12 / FastAPI / SQLAlchemy / Alembic |
| データベース | PostgreSQL 18 + PostGIS 3.6 |
| 開発環境 | Docker Compose（Node.js 24 / Python 3.12 でのローカル実行も可） |

## クイックスタート（Docker）

Docker Desktop（Compose v2）が必要です。コマンドはすべてプロジェクトのルート（`compose.yaml` があるフォルダ）で実行します。

**1. `.env` を作成し、`SECRET_KEY` を設定する**

```sh
cp .env.example .env
```

Windows（PowerShell）では `Copy-Item .env.example .env` を使います。
次のコマンドで生成したランダムな値を、`.env` の `SECRET_KEY=` に設定してください。サンプルの値や32文字未満の値では API が起動しません。

```sh
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**2. 起動する**

```sh
docker compose up --build
```

DB → API → フロントエンドの順に起動します。API の起動時に DB のマイグレーション（`alembic upgrade head`）が自動で実行されます。

**3. デモユーザーを作成する（任意）**

別のターミナルで実行します。何度実行しても重複しません。

```sh
docker compose exec backend python -m app.scripts.seed_demo_user
```

**4. ブラウザーで開く**

| URL | 内容 |
| --- | --- |
| <http://localhost:8081> | アプリ（Web版） |
| <http://localhost:8000/docs> | API ドキュメント（Swagger UI） |
| <http://localhost:8000/health> | API の稼働確認（`{"status":"ok"}`） |

停止は `Ctrl+C`、コンテナの削除は `docker compose down` です。DB と写真のデータはボリュームに残ります（`down -v` を付けると削除されます）。

Docker を使わない起動方法、スマホ実機での接続、うまく起動しない場合の対処は [docs/setup.md](docs/setup.md) を参照してください。

## デモアカウント

| 項目 | 値 |
| --- | --- |
| メールアドレス | `demo@example.com` |
| ニックネーム | `demo_walker` |
| パスワード | `DemoWalk123!` |

ログイン画面の「デモアカウントでログイン」ボタンは開発ビルドだけに表示されます。
開発中は `@example.com` の架空のアドレスでも新規登録できます（確認メールは送信しません）。

## ディレクトリ構成

```text
walking-App/
├── compose.yaml              # 開発用の Docker 構成（db / backend / frontend）
├── .env.example              # Docker Compose 用の環境変数の見本
├── docs/
│   └── setup.md              # 詳しい開発環境の構築手順
├── frontend/                 # React Native + Expo + TypeScript
│   ├── src/app/              # Expo Router の画面（index / login / track / photos）
│   ├── src/features/track/   # 散歩の記録・足跡の描画・地図上のピン
│   ├── login/                # 新規登録・ログイン画面
│   ├── auth/                 # 共通の認証状態
│   ├── photos/               # 場所の保存・写真の撮影と表示
│   ├── api/                  # API クライアント
│   ├── dev/                  # 開発サーバーの /api 転送（Metro ミドルウェア）
│   └── tests/                # Node のテスト
└── backend/                  # FastAPI
    ├── app/
    │   ├── main.py           # アプリの起点
    │   ├── routers/          # 認証・散歩の API
    │   ├── pins/             # ピンの API
    │   ├── photos/           # 写真の API と保存処理
    │   └── scripts/          # デモユーザーの作成など
    ├── migrations/           # Alembic のマイグレーション
    └── tests/                # pytest
```

## 開発コマンド

フロントエンド（`frontend` で実行）：

```sh
npm run typecheck
npm run lint
node --test "tests/*.test.*"
```

バックエンド（Docker で実行）：

```sh
docker compose run --rm backend python -m pytest -q
```

## 環境変数

| ファイル | 読み込むもの | 主な設定 |
| --- | --- | --- |
| ルートの `.env` | Docker Compose | `SECRET_KEY`（必須）、公開ポート、DB の初期設定、CORS |
| `frontend/.env` | ローカルで起動した Expo | API の接続先（`EXPO_PUBLIC_API_URL` など） |
| `backend/.env` | ローカルで起動した API（`--env-file .env`） | DB の接続先、`SECRET_KEY`、CORS |

各ファイルは同じ場所の `.env.example` をコピーして作成します。`.env` は Git で共有されません。
`EXPO_PUBLIC_` で始まる値はアプリに埋め込まれるため、秘密の値を入れないでください。

## 詳細ドキュメント

| ドキュメント | 内容 |
| --- | --- |
| [docs/setup.md](docs/setup.md) | 開発環境の構築（Docker／ローカル／スマホ実機）とトラブルシューティング |
| [backend/README.md](backend/README.md) | 認証・ピン API、DB のマイグレーション、API のローカル起動 |
| [backend/WALKS.md](backend/WALKS.md) | 散歩の足跡 API |
| [backend/PHOTOS.md](backend/PHOTOS.md) | 写真 API と保存先 |
| [frontend/api/README.md](frontend/api/README.md) | Web 版の `/api` 転送、スマホからの接続、HTTPS |
| [frontend/src/features/track/README.md](frontend/src/features/track/README.md) | 足跡画面の動作 |
| [frontend/photos/README.md](frontend/photos/README.md) | 場所の保存と写真の画面 |

## チーム開発

- `main` から作業ブランチを作成し、プルリクエストでレビューを受けてからマージします。
- `frontend/package-lock.json` と `backend/requirements.txt` で依存関係のバージョンを固定しています。プル後に依存関係が変わった場合は、`npm ci` / `pip install -r requirements.txt` を再実行するか、`docker compose up --build` で反映します。
- フロントエンドのライブラリは `frontend` で `npx expo install パッケージ名` を使って追加します。
- Python の依存関係は `requirements.in` を更新し、Python 3.12 の環境で `requirements.txt` を作り直します。Windows 非対応の `uvloop` の条件指定は維持してください。
- DB の構造を変更する場合は `backend/migrations/versions/` にマイグレーションを追加します。
