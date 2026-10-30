# 開発引き継ぎ（第7〜9章）

## 教材と到達点

教材: https://react-pokemon-zukan-doc.vercel.app/

本文の第7章はURLの `section-08`、第8章は `section-09`、第9章は `section-10` に対応します。URL番号と章番号は一致しません。

- 第7章: `src/pokemonTypesMap.ts` に18タイプの英語名・日本語名・色を追加。
- 第8章: `src/api/` に共通型、ポケモン型、一覧取得、日本語名取得、日本語名付き一覧取得を追加。`src/config.ts` でAPI URLと初回取得件数40件を管理。
- 第9章: `src/main.tsx` にQueryClientProviderを追加。`src/queryKeys.ts` に一覧・ID別詳細キーを追加。QueryClientはモジュールスコープで1つ作成。

教材指定に従い、画面からのAPI呼び出しは第10章以降で接続します。現時点では仮一覧・仮詳細のままで正常です。独自のUIや追加のデータ取得ライブラリは導入していません。

## 作業開始時の確認

取得元: `ripple2371/react-pokemon-zukan`、mainの `f9f049b`。
作業ディレクトリには初めリポジトリがなかったため、`work/repository` にcloneしました。
Vite + React + TypeScript、BrowserRouterの一覧・詳細・404ルート、Tailwind CSS v4のViteプラグインとCSSテーマは導入済みでした。
`PokemonCard.tsx` は番号と名前を表示する練習用コンポーネントで、一覧からは未使用。API・型対応表・Query設定は未作成でした。
既存の `react-router@8.5.1` と `react-router-dom@7.18.5` は異なるメジャーで併存しています。現在の画面はすべてreact-router-domを使用して正常に表示されます。既存依存の整理は今回行っていません。

## ファイルの役割

| ファイル | 役割 |
| --- | --- |
| src/pokemonTypesMap.ts | タイプ表示用の18件の対応表（読み取り専用） |
| src/config.ts | API URL、初回取得件数 |
| src/api/common.type.ts | API共通リソース型 |
| src/api/pokemon.type.ts | Pokemon、画像、タイプ、特性、ステータスなど |
| src/api/pokemon.ts | ページ指定による一覧取得、HTTP失敗時に例外 |
| src/api/pokemonSpecies.ts | ja-hrkt → ja → 英語名の順で名前を選択。失敗時も英語名へ戻す |
| src/api/pokemonWithJapaneseName.ts | 一覧・詳細・種族情報を組み合わせて返す |
| src/main.tsx | RouterとQuery Providerの起点 |
| src/queryKeys.ts | 一覧と詳細のキャッシュキー |
| scripts/verify-api.mjs | APIとキャッシュの検証。既存のViteを使い追加依存なし |
| package.json / package-lock.json | TanStack Queryの追加と検証コマンド |

教材の `PokemonMove.version_group_details` は持ち物用の `VersionDetail[]` を参照していました。実際のレスポンスに合わせ、`PokemonMoveVersion[]`（習得方法・バージョングループ・習得レベル・順番）へ補正しました。
根拠: https://pokeapi.co/docs/v2#pokemon

## 検証方法と結果

```sh
npm ci
npm run build
npm run lint
npm run check:api
npm run check:api -- --live
npm run dev
```

- 既存状態、第7章、第8章、第9章でTypeScriptチェック込みのbuild成功。
- 最終状態でbuild・Lint・API検証成功。npm auditは追加時点で脆弱性0件。
- API検証: 18タイプの重複なし、offset/limit、日本語の優先順位、英語名へのフォールバック、一覧・詳細HTTP失敗、通信失敗、一覧とID別クエリキーの区別、キャッシュ再利用。
- 実API検証: 1件取得でフシギダネ・番号1・タイプを確認。offset=1でivysaurを確認。
- ブラウザ: `/`、`/pokemon/1`、存在しないパスの404、404から一覧へのリンクを確認。Tailwindの青い見出し・灰色背景・余白を確認。
- 初回サンドボックス内サーバーへの接続がタイムアウトしたため、通常権限で起動した別ポート5174で画面検証を実施。

キャッシュ検証はテスト内でstaleTimeをInfinityに設定しています。アプリ側は教材どおりQueryClientの既定設定です。APIのJSONは教材の型定義で扱い、外部JSONの実行時スキーマ検証までは追加していません。

## 第10章以降の残作業

1. 第10章（`section-11-pokemon-list-screen`）: 一覧ページへuseInfiniteQueryと日本語名付き取得関数を接続。既存PokemonCardのPropsを確認してカード・画像・詳細リンク・追加読み込み・ローディング・エラー表示を実装。
2. 第11章: ID別詳細取得、種族情報と日本語説明、タイプバッジ、ステータス、戻る導線を実装。APIの個体IDと種族番号を混同しない。
3. 第12章: スマートフォン・タブレット・PCの表示確認と調整。
4. 第13章以降: GitHub Pages用Router/base設定、状態管理、デバッグ・テスト、公開手順を教材に沿って実施。

mainへの直接push・マージは行わず、`feat/chapters-7-9` でレビューします。

## 第2回：第7〜9章の再確認

18タイプ・API・日本語フォールバック・Provider・キーを再確認。build・lint・check:api -- --live成功。全importがreact-router-domを使用していることを確認し、直接依存react-routerを7.18.5に統一。dom側の7.18.5と重複を解消し、ルーティングAPIの変更なし。


## 第2回：第10〜11章

第7〜9章のPR: https://github.com/ripple2371/react-pokemon-zukan/pull/1 （未マージ）。そのheadから `feat/chapters-10-11` を作成。

### 変更ファイル

- `src/components/PokemonCard.tsx`: 日本語名・図鑑番号・画像・詳細リンク。既存の練習用 `src/PokemonCard.tsx` は保持。
- `src/pages/PokemonList.tsx`: useInfiniteQuery、40件単位、IntersectionObserver、自動・手動追加取得、スケルトン、初回/追加/更新失敗時の再試行。
- `src/api/pokemonDetail.ts`: 詳細・種族・タイプ・特性・種族値の日本語取得。画像フォールバック、404専用エラー、全国図鑑番号はspecies.idを使用。
- `src/api/pokemon.ts`: 欠番やフォームIDに対応する実在項目の索引取得。
- `src/queryKeys.ts`: 索引キーを追加。
- `src/components/PokemonTypeLabel.tsx`: 18タイプの色と背景に応じた文字色。
- `src/pages/PokemonDetail.tsx`: 不正ID検証、再試行、説明・特性・種族値と合計・前後移動・一覧へ戻る。
- `package.json` / lock: 教材指定のreact-loading-skeletonのみ追加。
- `scripts/verify-api.mjs`: 詳細404/HTTP失敗、実APIの日本語・6種族値と合計318、フォームID10001と種族番号386の区別、索引取得の検証を追加。

教材URLの末尾は `section-11-pokemon-list-screen` が正しい完全URLです。第11章は `section-12-pokemon-detail-screen`。

### 検証

第10章と第11章それぞれbuild・lint成功。既存APIテストに加えて詳細APIの正常/異常系と実API検証成功。ブラウザで初期スケルトン、日本語カード40件、追加取得で80件、カードから詳細、フシギダネの画像・説明・タイプ・特性・6種族値/合計318を確認。

### 残作業

第12章の各画面サイズでの体系的な表示確認、第13章のGitHub Pages設定・公開。第7〜9章のPRはマージしていないため、第10〜11章のレビューは `feat/chapters-7-9` をbaseにすると今回分だけ確認できます。mainへ直接push・マージは実施していません。

## 第3回：通信改善・第12〜13章（2026-10-31）

### 開始状態とブランチ

- main: f9f049b。PR #1はopen・未マージ、head 9d633ae、base main。
- PR #2はdraft・open・未マージ、head 4f3883f、base feat/chapters-7-9。
- `feat/chapters-12-13` をorigin/feat/chapters-10-11から作成。既存PRには変更を追加していない。
- Router 7.18.5はdedupe済み。新規ライブラリ追加なし。練習用の未使用src/PokemonCard.tsxや既存APIは互換性・学習記録のため保持。

### API最適化と測定

`src/api/resource.ts` に共有QueryClientとURL単位のリソース取得を追加。末尾スラッシュを正規化し、一覧・詳細・日本語名取得間で取得済みデータと処理中Promiseを共有する。
staleTimeは1時間、gcTimeは24時間（非アクティブ時の保持時間）。メモリ内のみで、ブラウザ再読み込み後は消える。実通信の同時実行は6本、通信タイムアウト15秒。失敗は成功データとして保存されない。
一覧は2回、詳細は404以外を最大3回、前後判定は2回のQueryリトライ。種族名の通信失敗時は従来どおり英語名を表示する。英語名になった一覧ページも1時間保持されるため、すぐ再取得したい場合はキャッシュ破棄が必要。
`cancelRefetch: false` によりObserverと手動ボタンが重なった場合の次ページ二重取得を抑止。

実測は `node scripts/measure-api.mjs` で同一プロセス内に初回40件→同じ40件→詳細1→次40件の順に呼び出したもの。改善前は4f3883f、改善後は通信改善時点。HTTP画像取得は対象外。各1回のAPI関数完了時間であり、初回画面描画時間・統計的な速度保証ではない。

| 処理 | 前のfetch回数 | 後のfetch回数 | 前の最大同時fetch | 後 | 前ms | 後ms |
|---|---:|---:|---:|---:|---:|---:|
| 初回40件 | 81 | 81 | 40 | 6 | 636 | 337 |
| 同じ40件 | 81 | 0 | 40 | 0 | 261 | 1 |
| 一覧後の詳細1 | 12 | 10 | 6 | 6 | 79 | 41 |
| 次の40件 | 81 | 81 | 40 | 6 | 562 | 273 |

初回の必要リクエスト数自体は削減していない。既存戻り値のタイプ・特性とフォーム対応を維持するため、RESTの詳細と種族情報を引き続き取得する。回線条件やHTTPキャッシュの影響があるため、時間差をコードだけの効果とは断定しない。

### 前後移動

`src/api/pokemonNavigation.ts` と `src/hooks/usePokemonNeighbors.ts` に責務を分離。
全件索引の2リクエスト（count確認＋全件）を画面では使用せず、200件ずつのREST一覧を走査し、対象と隣の実在項目が確定したら停止する。ページ境界は次ページ先頭を取得。対象外ID・終端では存在しないリンクを作らない。詳細取得に成功してから前後を取得するため、不正ID/404で索引通信は発生しない。
教材の並び順・フォームを含む対象範囲は維持。初期IDでは200件の1ページだけで済む。大きいフォームIDを直接開く場合は手前の複数ページを走査するため、全件一括より通信回数が増える可能性はある。公式RESTにIDからoffsetを検索する機能がないため、根拠のないID加減算はしない。取得済みページは1時間再利用する。
旧fetchPokemonIndexは外部利用互換性のため残したが、画面からは未使用。

### 第12章

教材のHeader・Navigation・Footer・logo.svgを追加してAppに接続。
一覧は2/3/4/6列、画像80→96px、文字サイズを幅に応じ調整。詳細は375pxで400px以下、md以上で最大672pxとし、内側余白と画像も調整。
長文折り返し・説明の改行保持・特性の折り返し・種族値バーの縮小・タップ領域44px以上を追加。タイプの背景に応じた黒/白文字選択は既存ロジックを維持。

### 第13章

教材のVite設定に合わせ、開発baseは `/`、build/previewは `/react-pokemon-zukan/`。
HashRouterに変更し、詳細URLは `https://ripple2371.github.io/react-pokemon-zukan/#/pokemon/25`。
`.github/workflows/deploy.yml` は教材の公式Pages Actions方式・Node24。ユーザー確認前の公開を避けるためpushトリガーは省略しworkflow_dispatchのみ、main限定。公開承認後にmainへ統合して手動実行する。Pages設定変更・ワークフロー実行・本番公開は未実施。
READMEに承認後の公開手順とURL方式、preview手順を記載。

### 追加・修正ファイル

- API: resource.ts（新規）、pokemonNavigation.ts（新規）、pokemon.ts、pokemonSpecies.ts、pokemonWithJapaneseName.ts、pokemonDetail.ts
- 状態/画面: hooks/usePokemonNeighbors.ts（新規）、main.tsx、App.tsx、pages/PokemonList.tsx、pages/PokemonDetail.tsx、components/PokemonCard.tsx
- 共通UI: components/Header.tsx・Navigation.tsx・Footer.tsx、assets/logo.svg（新規）
- 設定/検証/記録: vite.config.ts、.github/workflows/deploy.yml（新規）、scripts/measure-api.mjs（新規）、scripts/verify-api.mjs、README.md、DEVELOPMENT.md

### 検証結果と未実施

- npm ci成功。初回は前回ViteがネイティブモジュールをロックしてEPERMとなったため、このチェックアウトのViteプロセスだけ停止して再実行した。
- npm run build / npm run lint / npm run check:api / npm run check:api -- --liveすべて成功。型構文の設定不一致、テスト変数重複、キャッシュタイマーによる検証プロセス残留は修正して再実行済み。
- 通信テスト: 同時6本、同一URLの処理中重複排除、キャッシュ再利用、404/500/通信失敗、日本語優先順と英語フォールバック。
- 前後テスト: 先頭・末尾・欠番・フォーム・ページ境界・対象なし・500後の再試行。2ページfixtureで繰り返し判定しても実通信2回。
- 実API: フシギダネ、日本語特性、6種族値・合計318、フォーム10001/種族386、索引を確認。
- 本番previewのbaseパスで375/768/1280px × 一覧・詳細1・詳細25・不正ID・存在しないID・404の18画面を確認。すべて横overflowなし。スマートフォン一覧・タブレット詳細はスクリーンショットも目視確認。
- ピカチュウの直接アクセス/再読み込み、カード→詳細、次へ→前へ→一覧、スクロールで120件まで追加取得、最初の画像ロード成功を確認。
- ブラウザ内の回線遮断・500注入・再試行ボタンクリックは未実施。API層のモックテストで失敗/再試行を検証した。全種類の長い名前の実機確認も未実施。
- Actionsは本番公開を伴うため実行していない。Ubuntu上のnpm ci/buildと実Pages環境は未検証。公開承認後に確認する。

### マージ順と第14〜16章

PR #1 → PR #2 → 今回PRの順。先行PRをマージ後、後続PRのbaseをmainへ変更し差分・競合を再確認する。今回も既存PRのマージとmainへのpushは実施しない。
次回は第14章の状態管理・API連携の教材チェック、第15章のテスト/デバッグ拡充（ブラウザ通信失敗・実機・長い名前）、第16章の全体振り返り。公開はユーザー承認後にPages設定→手動実行→本番URLと詳細再読み込みを確認する。
