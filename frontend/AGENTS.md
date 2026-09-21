# フロントエンド開発の指針

Expo / React Native のモバイルアプリです。モバイル向けの設計、性能、OS 間の互換性を優先してください。

## バージョンに対応する公式資料

Expo は SDK ごとに仕様が変わります。Expo、EAS、React Native の API を扱うコードを書く前に、次を確認してください。

1. `package.json` の `expo` のメジャーバージョンを確認します。
2. 対応する資料 `https://docs.expo.dev/versions/v<major>.0.0/` を取得します。
3. その他は https://docs.expo.dev/llms.txt を取得し、必要なページへのリンクをたどります。記憶だけで判断しないでください。

## コマンド

`bun.lock` があるプロジェクトでは `npx` の代わりに `bunx` を使います。

```sh
npx expo install パッケージ名  # SDK と互換性のある版を選択するため必ず使用
npx expo start                 # 開発サーバー
npx expo lint                  # lint
npx tsc --noEmit               # 型チェック
npx expo-doctor                # 依存関係・設定の診断
npx expo install --fix         # 互換性のない依存関係を修正
```

完了を報告する前に lint と型チェックを実行してください。

## 画面遷移

画面遷移には Expo Router を使用してください。ルートは `src/app/` に配置し、各ファイルを画面、`_layout.tsx` をナビゲーター定義とします。コンポーネントやユーティリティ等は `src/app/` の外に置きます。

`Link`、`router`、`useLocalSearchParams` は `expo-router` からインポートします。
資料：https://docs.expo.dev/router/introduction.md

## EAS ビルド

クラウドでのビルド・署名・提出には EAS（`eas build`、`eas submit`）、無線更新には `eas update` を使用します。クラウドビルドにローカルの Xcode / Android Studio は不要です。

Bun では `bunx eas-cli コマンド`、npm では `npx eas-cli@latest コマンド` を使用します。
資料：https://docs.expo.dev/eas/index.md

## ネイティブ設定

- `ios/` と `android/` がない場合は自動生成（CNG）を前提とします。手動で作成・編集せず、`app.json` と設定プラグインで制御してください。
- Expo Go は組み込みのネイティブモジュールのみ利用できます。独自のネイティブコードを含むライブラリの追加後は、ローカルの `npx expo run:ios` / `npx expo run:android` またはクラウドの `eas build --profile development` で開発ビルドを作成します。
- 外部ライブラリより推奨 Expo モジュールを優先し、依存追加前に利用可能なスキルを確認してください。資料：https://docs.expo.dev/versions/latest/index.md
