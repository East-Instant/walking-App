# APIへの接続

Webは既定で画面と同じオリジンの `/api` に送信します。
スマホからPCのWeb画面を開いても、スマホ自身の `localhost` を参照しません。

開発中は `metro.config.js` のミドルウェアが `/api/...` をFastAPIへ転送します。
画像のmultipart、認証ヘッダー、レスポンスのステータスを維持してストリーム転送します。
転送先はサーバー側の設定に固定し、ブラウザからは変更できません。

| 設定 | 用途 |
| --- | --- |
| `EXPO_PUBLIC_WEB_API_URL` | WebのAPI接続先。既定は `/api` |
| `WALKING_API_PROXY_URL` | MetroからFastAPIへの接続先。Dockerでは `http://backend:8000` |
| `EXPO_PUBLIC_API_URL` | Expo Goなどネイティブの接続先。ローカルMetroの転送先としてもフォールバック |

Dockerでは `docker compose up -d frontend` で設定を反映します。
PCのAPI公開ポートが8001でも、Docker内部のAPIは8000なので設定変更は不要です。
ローカルExpoとDocker APIを組み合わせる場合は、`frontend/.env` に
`WALKING_API_PROXY_URL=http://localhost:8001` のように公開ポートを指定します。

スマホを同じWi-Fiに接続し、`http://PCのLAN側IP:8081` を開くとAPIへ通信できます。
ただし、スマホのブラウザで現在地を取得するには、信頼されたHTTPSのURLが必要です。
HTTPSでWebを公開する場合も `/api` を同じ入口から転送してください。
本変更で公開トンネルの作成やHTTPSの公開設定は行いません。

静的エクスポートにはMetroのプロキシは含まれません。公開先で `/api` のリバースプロキシを用意するか、
`EXPO_PUBLIC_WEB_API_URL` にスマホから到達可能なHTTPS API URLを指定して再ビルドしてください。
別オリジンのAPIに直接接続する場合は、APIの `CORS_ORIGINS` にWebのURLを追加する必要があります。

接続確認はWebと同じURLの `/api/health` で `{"status":"ok"}` が返ることを確認します。
テストは `node --test tests/api-proxy.test.cjs` で実行できます。

仕様参照: [Expo Metro](https://docs.expo.dev/guides/customizing-metro/)、
[Metro middleware](https://metrobundler.dev/docs/configuration/#enhancemiddleware)。
`enhanceMiddleware` は非推奨ですが、現在のExpo SDK 57の開発サーバーでサポートされています。
SDK更新時には転送の統合テストも実行してください。
