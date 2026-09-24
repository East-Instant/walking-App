# Walking App 開発環境

> バックエンドに認証・ピンAPI・PostGIS・Alembicを追加しました。DBは空ではなく、API起動にランダムな `SECRET_KEY` が必要です。最新の起動・移行・API・テスト手順は [backend/README.md](backend/README.md) を参照してください。以下の初期構築時の「空のDB」「DB不要」という説明は現在のバックエンドには適用されません。

## 新規登録・ログイン画面

起動時に新規登録のデモ画面が表示されます。メール形式、必須項目、パスワード（仮の条件：8文字以上）、確認用パスワード、同意チェックを検証し、登録完了のデモを表示します。入力情報は送信・保存されず、実際のアカウントは作成されません。利用規約・プライバシーポリシー本文は準備中の案内です。

新規登録・ログインの実装は `frontend/login/` にまとめています。画面は `screens/`、入力部品は `components/FormField.tsx`、入力チェックと差し替え用モックは `registration.ts` と `login.ts`、共通デザインは `styles.ts` にあります。`frontend/src/app/index.tsx` と `login.tsx` は Expo Router 用の入口です。従来のAPI接続確認画面はWebの `/health` で確認できます。

ログイン画面は `/login`、または新規登録画面の「ログイン」から開けます。デモ用メールアドレスは `demo@example.com`、パスワードは `walking123` です。「デモ用情報を入力する」から入力できます。他の値ではログイン失敗を表示します。新規登録時の入力ではログインできません。認証・ログイン状態の保存・パスワード再設定メールの送信は行いません。

依存関係を更新後、`frontend` で `npm ci`、`npm run web`（実機では `npm start`）を実行してください。

React Native（Expo / TypeScript）と Python（FastAPI）の開発環境です。Docker の有無が異なるメンバーでも、同じコードで開発できます。

PostgreSQL 18 も Docker で起動します。今回は起動確認用の初期基盤のため、空のデータベースのみを用意し、アプリ用テーブル・サンプルデータ・API からの DB 接続処理はまだ実装していません。

## 起動方法の選び方

| 開発方法 | 必要なもの | 用途 |
| --- | --- | --- |
| すべて Docker | Docker Desktop（Compose v2） | フロント・API・DB を起動 |
| 両方ローカル | Node.js 24、Python 3.12 | Docker を入れていないメンバー向け |
| API・DB は Docker | Docker Desktop、Node.js 24 | スマホ実機での開発におすすめ |

Docker 構成は開発用です。Web 版・API・PostgreSQL を起動します。スマホアプリは端末の Expo Go、または開発ビルドで実行します。iOS / Android のエミュレーターはコンテナに含みません。

## 1. すべて Docker で起動

この手順では、フロントエンド（Web 版）・API・PostgreSQL の3つをまとめて起動します。PC に Node.js、Python、PostgreSQL を個別にインストールする必要はありません。Docker Desktop と、このプロジェクト一式を用意してください。

### 手順1：Docker Desktop を起動する

Docker Desktop を開き、エンジンの起動が完了するまで待ちます。続いてターミナル（Windows は PowerShell、macOS は「ターミナル」など）を開き、次を実行します。

```sh
docker info
docker compose version
```

`docker info` にサーバー情報が表示され、`docker compose version` にバージョンが表示されれば準備完了です。Docker に接続できないエラーが出る場合は、Docker Desktop が起動しているか確認してください。

### 手順2：プロジェクトのフォルダへ移動する

「プロジェクトのルート」は、`compose.yaml`、`frontend`、`backend` が入っている `walking_app` フォルダのことです。`frontend` や `backend` の中ではなく、このフォルダでコマンドを実行します。

たとえば、ホームフォルダ直下にプロジェクトを保存した場合は次のとおりです。別の場所に保存した場合は、その場所に合わせてパスを変更してください。

macOS / Linux：

```sh
cd ~/walking_app
ls
```

Windows（PowerShell）：

```powershell
cd "$HOME\walking_app"
dir
```

一覧に `compose.yaml` があることを確認してください。VS Code を使う場合は、`walking_app` フォルダを開いて「ターミナル」→「新しいターミナル」から実行しても構いません。

### 手順3：3つのサービスを起動する

```sh
docker compose up --build
```

`--build` は、フロントと API の実行環境を Dockerfile から作成する指定です。PostgreSQL は既製のイメージを取得して起動します。初回はダウンロードに数分以上かかることがあります。

ログが流れ続け、コマンド入力に戻らないのは正常です。このターミナルは起動したままにしてください。ブラウザーは自動では開かないため、次の手順で自分で開きます。

標準設定では `.env` の作成は不要です。`port is already allocated` / `address already in use` が出た場合は、下の「起動できない場合」を参照してください。

### 手順4：起動状態を確認する

別のターミナルを開き、手順2と同じ `walking_app` フォルダへ移動して実行します。

```sh
docker compose ps
```

次の状態が目安です。

| SERVICE | STATUS の目安 | 意味 |
| --- | --- | --- |
| `db` | `Up ... (healthy)` | PostgreSQL が接続を受け付けている |
| `backend` | `Up ... (healthy)` | API のヘルスチェックが成功している |
| `frontend` | `Up ...` | フロントのコンテナが動いている |

フロントは `Up` になった後も依存パッケージの準備が続くことがあります。起動元のログに `Waiting on http://...:8081` などの待機メッセージが出てから、次の URL を開いてください。

### 手順5：ブラウザーで画面と API を確認する

同じ PC の Chrome、Edge、Safari などで、以下を順番に開きます。

| 開く URL | 確認する内容 |
| --- | --- |
| <http://localhost:8000/health> | `{"status":"ok"}` と表示されること |
| <http://localhost:8000/docs> | 「Walking App API」と `GET /health` が表示されること |
| <http://localhost:8081> | 「Walking App」の画面が表示されること |

画面にある「API 接続を確認」ボタンを押してください。**「接続成功：API は正常に動作しています」** と表示されれば、フロントから API への通信も成功です。

API ドキュメントでは `GET /health` → `Try it out` → `Execute` を押すと、API を実行できます。レスポンスが `200`、本文が `{"status":"ok"}` になれば正常です。

ここでの `localhost` は、Docker を起動している自分の PC を指します。スマホから確認する場合は、後述の「スマホ実機・エミュレーターの接続設定」を参照してください。DB は空の状態で、今回の接続確認ボタンは API までを確認します。

### 手順6：開発を終了する・再開する

起動コマンドを実行したターミナルで `Ctrl+C` を押すと停止します。続いて次を実行すると、このプロジェクトのコンテナとネットワークを削除できます。DB の保存データは残ります。

```sh
docker compose down
```

次回も、Docker Desktop を起動して `walking_app` フォルダで `docker compose up --build` を実行すれば再開できます。ソースの変更は、起動中の開発サーバーに自動反映されます。

### 起動できない場合

| 状況 | 対応 |
| --- | --- |
| `no configuration file provided` | `compose.yaml` があるフォルダへ移動して実行します。 |
| Docker に接続できない | Docker Desktop の起動完了を待ち、`docker info` を再実行します。 |
| 5432 ポートが使用中 | 下記の方法で、このプロジェクトの DB 公開ポートを変更します。 |
| 8000 / 8081 ポートが使用中 | 同じポートで起動中のローカル開発サーバーなどを停止してから再実行します。 |
| 画面が開かない / API 接続に失敗する | `docker compose ps -a` と `docker compose logs --tail=50 frontend backend db` で停止状態やエラーを確認します。初回の準備中なら完了を待って再読み込みします。 |

DB の公開ポートなどを変更する場合は、ルートの `.env.example` を同じフォルダ内に `.env` という名前でコピーします。既に `.env` がある場合は、上書きせずそのファイルを編集してください。

5432 が使用中なら `.env` の該当行を次のように変更し、`docker compose up --build` を再実行します。

```dotenv
POSTGRES_PORT=5433
```

この設定は各自の PC 用です。`.env` は Git で共有されません。フロントと API の URL は変更不要です。

## 2. Docker なしで起動

現時点の API は DB を使用しないため、Docker なしでフロントと API を確認する場合、PostgreSQL のインストールは不要です。

Node.js 24 と Python 3.12 をインストールしてください。macOS / Linux で nvm を使う場合はルートで `nvm install`、`nvm use` を実行できます。

### API：macOS / Linux

ルートから実行します。

```sh
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### API：Windows（PowerShell）

仮想環境の有効化は不要です。ルートから実行します。

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### フロントエンド：各 OS 共通

別のターミナルを開き、ルートから実行します。

```sh
cd frontend
npm ci
npm run web
```

ブラウザーで <http://localhost:8081> を開きます。スマホで動かす場合は `npm run web` の代わりに `npm start` を実行し、下記の実機設定を行ってください。

## 3. API・DB は Docker、フロントエンドはローカル

ルートから API を起動します。PostgreSQL も自動で起動します。

```sh
docker compose up --build backend
```

別のターミナルで実行します。

```sh
cd frontend
npm ci
npm start
```

## PostgreSQL（空の開発用データベース）

`docker compose up --build` で DB → API → フロントの順に起動します。DB と API のヘルスチェックが成功してから次のサービスを起動します。API の `/health` は API 自体の稼働確認です。

標準の接続情報は次のとおりです（ローカル開発専用）。

| 項目 | 値 |
| --- | --- |
| ホストからの接続先 | `localhost:5432` |
| Docker 内での接続先 | `db:5432` |
| データベース | `walking_app` |
| ユーザー | `walking_app` |
| パスワード | `walking_app_dev` |

起動状態と空の DB を確認できます。

```sh
docker compose ps
docker compose exec db psql -U walking_app -d walking_app -c 'SELECT 1;'
docker compose exec db psql -U walking_app -d walking_app -c '\dt'
```

`\dt` でテーブルが見つからないのが今回の正常な状態です。初期化 SQL やマイグレーションはまだありません。接続情報を変更した場合は、確認コマンドのユーザー名・DB 名も合わせて変更してください。

データは `postgres_data` ボリュームに保存され、通常の `docker compose down` では残ります。`docker compose down -v` はデータも削除するため、保持したい場合は付けないでください。PostgreSQL のユーザー・パスワード・DB 名の環境変数は初回初期化時に適用されます。初期化後に `.env` を変更するだけでは既存の DB 設定は変わりません。

5432 が使用中の場合はルートの `.env` に `POSTGRES_PORT=5433` 等を指定します。Docker 内の接続先は引き続き `db:5432` です。

## スマホ実機・エミュレーターの接続設定

`frontend/.env.example` を `frontend/.env` にコピーし、`EXPO_PUBLIC_API_URL` を実行環境に合わせます。

| 実行環境 | API の URL |
| --- | --- |
| 同じ PC のブラウザー / iOS シミュレーター | `http://localhost:8000` |
| Android Studio の標準エミュレーター | `http://10.0.2.2:8000` |
| iPhone / Android 実機 | `http://PCのLAN側IPアドレス:8000` |

実機の例：`EXPO_PUBLIC_API_URL=http://192.168.1.10:8000`

1. PC とスマホを同じ Wi-Fi に接続します。
2. PC の IP を確認します（Windows は `ipconfig`、macOS はシステム設定のネットワーク詳細）。
3. スマホのブラウザーで `http://PCのIP:8000/health` にアクセスできることを確認します。
4. `frontend` で `npm start` を実行し、SDK 57 に対応する Expo Go で QR コードを読み取ります。
5. 環境変数を変更した場合は Expo を再起動し、アプリを再読み込みします。

実機の `localhost` はスマホ自身を指します。接続できない場合は、PC のファイアウォールで開発用の 8000 / 8081 ポートを確認してください。Expo のトンネルを使っても API は自動で公開されません。

ネイティブの独自機能を追加する場合は開発ビルドへ移行します。ローカルの iOS ビルドには macOS / Xcode、Android ビルドには Android Studio 等が必要です。

## 環境変数

| ファイル | 読み込むもの | 設定 |
| --- | --- | --- |
| ルート `.env` | Docker Compose | API 接続先、CORS の許可元、PostgreSQL の初期設定 |
| `frontend/.env` | ローカルの Expo | API 接続先 |
| `backend/.env` | `--env-file .env` を指定した Uvicorn | CORS の許可元 |

API 側の設定を変える場合は `backend/.env.example` を `.env` にコピーし、起動コマンドに `--env-file .env` を追加してください。

別 PC のブラウザーから開く場合は `CORS_ORIGINS` に `http://PCのIP:8081` を追加します。複数の許可元はカンマで区切ります。API のメソッドを増やす場合は `backend/app/main.py` の `allow_methods` も変更します。

`EXPO_PUBLIC_` で始まる値はアプリに埋め込まれるため、秘密鍵やパスワードを入れないでください。個人の `.env` は Git 管理対象外です。

## チーム開発

- `frontend/package-lock.json` と `backend/requirements.txt` を共有し、全員同じバージョンを使用します。
- プル後に依存関係が変わったら、ローカルは `npm ci` / `pip install -r requirements.txt` を再実行します。Docker は `docker compose up --build` で反映します。
- フロントエンドのライブラリ追加は `frontend` で `npx expo install パッケージ名` を使用します。
- Python の依存追加は `requirements.in` を更新し、Python 3.12 の仮想環境でインストール後、固定済みの `requirements.txt` を更新します。Windows 非対応の `uvloop` の条件指定を維持してください。
- Docker の `node_modules` は専用ボリュームに分離しています。ホストと Linux の依存パッケージを混在させません。
- 8000 / 8081 が使用中の場合は、先に起動した開発サーバーを停止してください。Docker 版とローカル版を同じポートで同時に起動しないでください。

## 検証コマンド

```sh
cd frontend
npm run typecheck
npm run lint
npx expo export --platform web
```

API は `backend` の仮想環境を使って実行します。

```sh
python -m pytest -q
```

Docker では次のコマンドで API テストを実行できます。

```sh
docker compose run --rm backend python -m pytest -q
```

## ディレクトリ構成

```text
walking_app/
├── frontend/           # React Native + Expo + TypeScript
│   ├── App.tsx         # API 接続確認画面
│   └── Dockerfile
├── backend/
│   ├── app/main.py     # FastAPI /health
│   ├── tests/          # API と CORS のテスト
│   ├── requirements.txt
│   └── Dockerfile
└── compose.yaml        # 開発用 Docker 構成
```

## 構築時の確認事項

- `npm audit` は Expo の間接依存（`xcode` → `uuid`）に由来する moderate 10 件を報告しています。提案される自動修正は Expo 46 への変更を含むため適用していません。互換性を確認せず `npm audit fix --force` を実行しないでください。
- API テストは成功しますが、現在の Starlette からテスト用 HTTP クライアント等の非推奨警告が出ます。
- スマホ実機と Windows 上の実行確認は、各メンバーの端末で行ってください。

## 公式ドキュメント

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- [Expo の開発環境](https://docs.expo.dev/get-started/set-up-your-environment/)
- [Expo の環境変数](https://docs.expo.dev/guides/environment-variables/)
- [FastAPI と Docker](https://fastapi.tiangolo.com/deployment/docker/)

- [PostgreSQL の Docker 構成](https://docs.docker.com/guides/postgresql/)
