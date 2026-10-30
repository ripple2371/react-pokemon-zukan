# Reactポケモン図鑑

授業教材 [Reactポケモン図鑑 Docs](https://react-pokemon-zukan-doc.vercel.app/) に沿って作成した、日本語対応のポケモン図鑑です。
第1〜16章の成果をmainへ統合済み。2026年10月31日にGitHub Pagesで公開し、本番環境の動作を確認しました。

公開URL: https://ripple2371.github.io/react-pokemon-zukan/

## 使用技術

React 19 / TypeScript 6 / Vite 8 / React Router 7（HashRouter）/ Tailwind CSS v4 / TanStack Query v5 / PokeAPI。
ローディング表示にreact-loading-skeletonを使用。自動UIテストのみPlaywright Testを使用します。

## 実装済み機能

- 初回40件、日本語名・全国図鑑番号・画像付きカード、スクロール/ボタンによる追加取得
- 詳細の日本語名・説明・タイプ・特性・6種族値と合計
- 実在するポケモンの順番での前後移動（欠番・フォームID対応）
- 日本語名が取得できない場合の英語名、画像データがない場合の代替表示
- 不正ID・404・通信エラー・再読み込み・読み込み通知
- スマートフォン・タブレット・PC対応、キーボード操作とフォーカス表示
- メモリ内キャッシュ、同一通信の重複排除、同時通信最大6本、15秒タイムアウト

## Windowsでローカル起動

1. Node.js 24系、Git、Visual Studio Codeをインストールします。
2. リポジトリをcloneし、VS Codeの「ファイル → フォルダーを開く」でプロジェクトを開きます。
3. 「ターミナル → 新しいターミナル」を開き、package.jsonがあるフォルダーで以下を実行します。

```powershell
npm ci
npm run dev
```

ターミナルに表示されるLocalのURLをブラウザで開きます。詳細URLは `http://localhost:5173/#/pokemon/25` です。
停止はターミナルで Ctrl+C。ポート番号が別の場合は表示された番号を使います。
`npm ci` がEPERMで失敗する場合は、このプロジェクトの起動中のdev/previewをCtrl+Cで停止して再実行します。

## テスト

```powershell
npm run build
npm run lint
npm run check:api
npm run check:api -- --live
npm run check:ui
```

- build: TypeScriptの型確認と `dist/` への本番出力
- lint: 未使用import・変数、React Hooksなどの静的確認
- check:api: 外部通信なしで正常/異常系、タイムアウト、6本制限、キャッシュ・重複排除、前後判定を確認
- check:api -- --live: 上記と実PokeAPIへの少数の通信を確認（ネット接続が必要）
- check:ui: 本番build後、API/画像を模擬し、375・768・1280pxで画面・500/通信断/再試行・キーボード・コントラストを確認

WindowsのUIテストはインストール済みのGoogle Chromeを使用します。Chromeがない場合は先に公式サイトからインストールしてください。
Windows以外では `npx playwright install chromium` でテスト用ブラウザを用意します。実行環境によってはOS依存パッケージも必要です。
UIテストが使う4173番ポートで別の古いpreviewが動いている場合はCtrl+Cで停止してから実行します。
失敗時は `test-results/` にスクリーンショットとtraceを保存します。これらはGitへ追加しません。

実通信の計測は `node scripts/measure-api.mjs`、初回40件がDOMへ表示されるまでの計測はpreview起動中に `node scripts/measure-ui.mjs` で行えます。
計測値は回線・キャッシュ・実行端末で変動し、画像全件の読み込み完了時間や統計的な速度保証ではありません。

## 公開前に本番ビルドを確認

```powershell
npm run build
npm run preview
```

以下を直接開き、ブラウザの更新ボタンでも詳細が表示されることを確認します。

- `http://localhost:4173/react-pokemon-zukan/`
- `http://localhost:4173/react-pokemon-zukan/#/pokemon/25`

開発baseは `/`、本番build/previewのbaseは `/react-pokemon-zukan/`。
公開先は [https://ripple2371.github.io/react-pokemon-zukan/](https://ripple2371.github.io/react-pokemon-zukan/) を想定しています。
詳細は [https://ripple2371.github.io/react-pokemon-zukan/#/pokemon/25](https://ripple2371.github.io/react-pokemon-zukan/#/pokemon/25) です。
`#/` を省いた `/pokemon/25` はGitHub Pagesで404になるため使用しません。

## GitHub Pagesの公開・更新手順（更新デプロイも承認後）

初回公開は承認を受けて完了しています。Pages SourceはGitHub Actionsです。以下は設定確認と、承認後の更新デプロイの手順です。

1. PR #1〜#4は統合済みです。更新時は変更PRをレビューし、承認後にmainへマージします。
2. リポジトリの「Settings」をクリックします。見えない場合はリポジトリの管理権限があるアカウントを確認してください。
3. 左側「Pages」を開き、「Build and deployment」の「Source」で **GitHub Actions** を選びます。
4. 上部の「Actions」から **Deploy GitHub Pages** を選択します。
5. 「Run workflow」をクリックし、Branchが **main** であることを確認して実行します。これが本番公開を開始する操作です。
6. 実行一覧でbuildとdeployが緑になるまで待ちます。environmentの承認が表示されたら内容を確認して承認します。
7. 上記の想定公開URLと詳細URLを開きます。詳細で再読み込みし、画像・日本語名・一覧への戻り・前後移動を確認します。
8. 失敗した場合はActionsの実行を開き、赤いステップのログを確認します。権限エラーの場合はPagesのSourceと実行ブランチを確認し、秘密情報をログやチャットへ貼らないでください。

`.github/workflows/deploy.yml` はNode24でnpm ci/buildを行い、`dist/` を公式Pages Actionsでアップロード・公開します。
権限はcontents:read、pages:write、id-token:write。手動実行のみ・main限定なので、pushやPR作成だけでは公開されません。
更新時も承認前にこのワークフローを再実行しないでください。

## 既知の制限事項

- 初回40件はREST一覧1回＋個体詳細40回＋種族40回＝81リクエスト。公式APIと既存機能を維持するため、無理な削減はしていません。
- キャッシュはstaleTime 1時間、非アクティブ時のgcTime 24時間。再読み込みでメモリから消えます。日本語取得に失敗したページの英語名も一時的に残ります。
- 後方のフォームIDを直接開く場合、前後判定は200件単位で対象まで走査するため通信回数が増える場合があります。
- 画像のURLが返らないケースは代替表示しますが、画像配信サーバー自体の障害を自動修復する機能はありません。
- 外部JSONはTypeScriptの型で扱いますが、全フィールドの実行時スキーマ検証は追加していません。
- GitHub Actionsと実公開URLはChromeで確認済みです。iOS/Android実機・スクリーンリーダーの人手確認は未実施です。
- 検索・お気に入り・Local Storageなどの任意追加機能は対象外です。

章ごとの変更・測定値・検証結果は [DEVELOPMENT.md](DEVELOPMENT.md) を参照してください。

## 初回公開の記録

- 公開コミット: `0399642b3d8aea8fbfe1da2aa773d51447b78e2a`
- [成功したGitHub Actions実行](https://github.com/ripple2371/react-pokemon-zukan/actions/runs/41132782666)（build/deployとも成功）
- 本番で初回40件・追加80件、ピカチュウ詳細、前後移動、直接URL/再読み込み、3画面幅、異常系を確認。
- その後の文書更新は別PRで提示し、自動再デプロイは行っていません。
