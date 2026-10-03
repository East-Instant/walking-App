# 開発環境の構築

Walking App の開発環境を作る手順です。最短の手順はルートの [README.md](../README.md#クイックスタートdocker) にあります。このページでは、各手順をもう少し詳しく説明します。

## 起動方法の選び方

| 開発方法 | 必要なもの | 用途 |
| --- | --- | --- |
| [1. すべて Docker](#1-すべて-docker-で起動) | Docker Desktop（Compose v2） | 標準の方法。フロント・API・DB をまとめて起動 |
| [2. API・DB は Docker、フロントはローカル](#2-apidb-は-dockerフロントエンドはローカル) | Docker Desktop、Node.js 24 | スマホ実機（Expo Go）での開発におすすめ |
| [3. すべてローカル](#3-すべてローカルで起動) | Node.js 24、Python 3.12、PostgreSQL 18 + PostGIS | Docker を使えない場合 |

Docker の構成は開発用です。iOS / Android のエミュレーターはコンテナに含みません。スマホでは Expo Go または開発ビルドで実行します。

## 1. すべて Docker で起動

この手順では、フロントエンド（Web 版）・API・DB（PostgreSQL + PostGIS）の3つをまとめて起動します。PC に Node.js、Python、PostgreSQL をインストールする必要はありません。

### 手順1：Docker Desktop を起動する

Docker Desktop を開き、エンジンの起動が完了するまで待ちます。ターミナル（Windows は PowerShell、macOS は「ターミナル」など）を開き、次を実行します。

```sh
docker info
docker compose version
```

`docker info` にサーバーの情報が、`docker compose version` にバージョンが表示されれば準備完了です。

### 手順2：プロジェクトのルートへ移動する

「プロジェクトのルート」は、`compose.yaml`、`frontend`、`backend` が入っているフォルダです。`frontend` や `backend` の中ではなく、このフォルダでコマンドを実行します。

macOS / Linux（ホームフォルダの直下に保存した場合）：

```sh
cd ~/walking-App
ls
```

Windows（PowerShell）：

```powershell
cd "$HOME\walking-App"
dir
```

一覧に `compose.yaml` があることを確認してください。VS Code では、このフォルダを開いて「ターミナル」→「新しいターミナル」から実行しても構いません。

### 手順3：秘密鍵（SECRET_KEY）を設定する

API はログインのトークンに署名するため、ランダムな秘密鍵（`SECRET_KEY`）がないと起動しません。

ルートの `.env.example` をコピーして `.env` を作成します。既に `.env` がある場合は、上書きせずにそのファイルを編集してください。

```sh
cp .env.example .env              # macOS / Linux
Copy-Item .env.example .env       # Windows（PowerShell）
```

次のコマンドでランダムな値を生成します（Windows で `python` が見つからない場合は `py` を使います）。

```sh
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

`.env` の `SECRET_KEY=` の行を、生成した値に書き換えます。サンプルの値のままや、32文字未満の値では API が起動しません。

```dotenv
SECRET_KEY=ここに生成した値を貼り付ける
```

`.env` は各自の PC 用で、Git では共有されません。

### 手順4：3つのサービスを起動する

```sh
docker compose up --build
```

`--build` は、フロントと API の実行環境を Dockerfile から作成する指定です。初回はダウンロードに数分以上かかることがあります。

API のコンテナは、起動時に DB のマイグレーション（`alembic upgrade head`）を実行してから API を起動します。

ログが流れ続け、コマンドの入力に戻らないのは正常です。このターミナルは起動したままにしてください。ブラウザーは自動では開きません。

### 手順5：起動状態を確認する

別のターミナルを開き、プロジェクトのルートで実行します。

```sh
docker compose ps
```

| SERVICE | STATUS の目安 | 意味 |
| --- | --- | --- |
| `db` | `Up ... (healthy)` | DB が接続を受け付けている |
| `backend` | `Up ... (healthy)` | API のヘルスチェックが成功している |
| `frontend` | `Up ...` | フロントのコンテナが動いている |

フロントは `Up` になった後も依存パッケージの準備が続くことがあります。起動したターミナルのログに `Waiting on http://...:8081` などが出てから、次へ進んでください。

### 手順6：ブラウザーで確認する

| URL | 確認する内容 |
| --- | --- |
| <http://localhost:8000/health> | `{"status":"ok"}` と表示される |
| <http://localhost:8000/docs> | 「Walking App API」の API ドキュメントが表示される |
| <http://localhost:8081> | アプリの新規登録画面が表示される |

アプリを試すには、新規登録するか、デモユーザーを作成してログインします。

```sh
docker compose exec backend python -m app.scripts.seed_demo_user
```

デモユーザーは `demo@example.com`（または `demo_walker`）、パスワードは `DemoWalk123!` です。

### 手順7：終了する・再開する

起動したターミナルで `Ctrl+C` を押すと停止します。続けて次を実行すると、コンテナとネットワークを削除できます。

```sh
docker compose down
```

DB のデータ（`postgres_data`）と写真（`photo_data`）はボリュームに残ります。`docker compose down -v` を実行するとこれらも削除されるため、データを残したい場合は `-v` を付けないでください。

次回も、Docker Desktop を起動してルートで `docker compose up --build` を実行すれば再開できます。ソースの変更は起動中の開発サーバーに自動で反映されます。マイグレーションや依存関係が変わった場合も `--build` で反映されます。

## 2. API・DB は Docker、フロントエンドはローカル

ルートの `.env` に `SECRET_KEY` を設定したうえで（[手順3](#手順3秘密鍵secret_keyを設定する)）、API と DB を起動します。

```sh
docker compose up --build backend
```

別のターミナルでフロントを起動します。

```sh
cd frontend
npm ci
npm start      # スマホ（Expo Go）で開く場合
npm run web    # PC のブラウザーで開く場合
```

スマホから接続する場合は、[スマホ実機・エミュレーターの接続](#スマホ実機エミュレーターの接続)の設定も行ってください。

## 3. すべてローカルで起動

Node.js 24、Python 3.12、PostGIS を有効にした PostgreSQL 18 が必要です。macOS / Linux で nvm を使う場合は、ルートで `nvm install`、`nvm use` を実行できます。

### API

`backend` で仮想環境を作成し、依存関係をインストールします。

macOS / Linux：

```sh
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

Windows（PowerShell）：

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

`backend/.env.example` を `backend/.env` にコピーし、次を変更します。

- `SECRET_KEY` を[ランダムな値](#手順3秘密鍵secret_keyを設定する)にする
- `DATABASE_URL` のホスト `db` を `localhost` に変え、ポートを自分の PostgreSQL に合わせる

マイグレーションを実行してから API を起動します（`backend` で実行）。

```sh
python -c "from dotenv import load_dotenv; load_dotenv(); from alembic.config import main; main(argv=['upgrade', 'head'])"
python -m uvicorn app.main:app --env-file .env --reload --host 0.0.0.0 --port 8000 --no-access-log
```

詳しい設定は [backend/README.md](../backend/README.md) を参照してください。

### フロントエンド

別のターミナルで、ルートから実行します。

```sh
cd frontend
npm ci
npm run web
```

ブラウザーで <http://localhost:8081> を開きます。

## スマホ実機・エミュレーターの接続

Expo Go などのネイティブアプリは `EXPO_PUBLIC_API_URL` に直接接続します。ローカルで Expo を起動する場合は、`frontend/.env.example` を `frontend/.env` にコピーして設定します。

| 実行環境 | `EXPO_PUBLIC_API_URL` |
| --- | --- |
| 同じ PC のブラウザー / iOS シミュレーター | `http://localhost:8000` |
| Android Studio の標準エミュレーター | `http://10.0.2.2:8000` |
| iPhone / Android 実機 | `http://PCのLAN側IPアドレス:8000` |

実機の例：`EXPO_PUBLIC_API_URL=http://192.168.1.10:8000`

1. PC とスマホを同じ Wi-Fi に接続します。
2. PC の IP アドレスを確認します（Windows は `ipconfig`、macOS はシステム設定のネットワークの詳細）。
3. スマホのブラウザーで `http://PCのIP:8000/health` を開き、`{"status":"ok"}` が表示されることを確認します。
4. `frontend` で `npm start` を実行し、SDK 57 に対応する Expo Go で QR コードを読み取ります。
5. 環境変数を変更した場合は、Expo を再起動してアプリを再読み込みします。

実機の `localhost` はスマホ自身を指します。接続できない場合は、PC のファイアウォールで 8000 / 8081 ポートが許可されているか確認してください。

Web 版は画面と同じ URL の `/api` を経由して API に接続します。スマホのブラウザーで Web 版を開く場合や、現在地の取得に必要な HTTPS については [frontend/api/README.md](../frontend/api/README.md) を参照してください。

## 環境変数

| ファイル | 読み込むもの | 主な設定 |
| --- | --- | --- |
| ルートの `.env` | Docker Compose | `SECRET_KEY`、公開ポート（`BACKEND_PORT` / `POSTGRES_PORT`）、DB の初期設定、`CORS_ORIGINS` |
| `frontend/.env` | ローカルで起動した Expo | `EXPO_PUBLIC_API_URL`、`EXPO_PUBLIC_WEB_API_URL`、`WALKING_API_PROXY_URL` |
| `backend/.env` | ローカルで起動した API（`--env-file .env`） | `DATABASE_URL`、`SECRET_KEY`、`CORS_ORIGINS`、`PHOTO_STORAGE_DIR` |

- `backend/.env` は Docker Compose では読み込まれません。Docker での API の設定はルートの `.env` と `compose.yaml` で管理します。
- 別の PC のブラウザーから直接 API に接続する場合は、`CORS_ORIGINS` に `http://PCのIP:8081` を追加します。複数の値はカンマで区切ります。
- `EXPO_PUBLIC_` で始まる値はアプリに埋め込まれるため、秘密の値を入れないでください。

### DB の接続情報（ローカル開発専用）

| 項目 | 値 |
| --- | --- |
| PC からの接続先 | `localhost:5432` |
| Docker 内からの接続先 | `db:5432` |
| データベース | `walking_app` |
| ユーザー | `walking_app` |
| パスワード | `walking_app_dev` |

```sh
docker compose exec db psql -U walking_app -d walking_app -c '\dt'
```

DB のユーザー・パスワード・DB 名は、ボリュームを最初に作成したときだけ適用されます。作成後に `.env` を変更しても、既存の DB の設定は変わりません。

## 起動できない場合

| 状況 | 対応 |
| --- | --- |
| `no configuration file provided` | `compose.yaml` があるフォルダへ移動して実行します。 |
| `Set SECRET_KEY in root .env` | ルートに `.env` を作成し、`SECRET_KEY` を設定します（[手順3](#手順3秘密鍵secret_keyを設定する)）。 |
| `SECRET_KEY に32文字以上のランダムな秘密鍵を設定してください` | サンプルの値のままか、短すぎます。生成した値に変更します。 |
| Docker に接続できない | Docker Desktop の起動完了を待ち、`docker info` を再実行します。 |
| 5432 ポートが使用中 | ルートの `.env` で `POSTGRES_PORT=5433` などに変更します。Docker 内の接続先は `db:5432` のままです。 |
| 8000 ポートが使用中 | 先に起動している API を停止するか、ルートの `.env` で `BACKEND_PORT=8001` などに変更します（Expo Go の `EXPO_PUBLIC_API_URL` も合わせて変更）。 |
| 8081 ポートが使用中 | 先に起動しているローカルの Expo などを停止します。Docker 版とローカル版を同時に起動しないでください。 |
| 画面が開かない / API に接続できない | `docker compose ps -a` と `docker compose logs --tail=50 frontend backend db` で状態とエラーを確認します。初回の準備中なら、完了を待って再読み込みします。 |

## 既知の注意点

- `npm audit` は Expo の間接依存に由来する警告を報告します。`npm audit fix --force` は Expo のバージョンを変更してしまうため、互換性を確認せずに実行しないでください。
- DB の `postgis/postgis` イメージは amd64 版のため、Apple Silicon の Mac ではエミュレーションで動作します。

## 公式ドキュメント

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- [Expo の開発環境](https://docs.expo.dev/get-started/set-up-your-environment/)
- [Expo の環境変数](https://docs.expo.dev/guides/environment-variables/)
- [FastAPI と Docker](https://fastapi.tiangolo.com/deployment/docker/)
- [PostgreSQL の Docker 構成](https://docs.docker.com/guides/postgresql/)
