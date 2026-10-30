# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

## 教材の進捗

第7〜9章の実装・検証結果と残作業は [DEVELOPMENT.md](DEVELOPMENT.md) を参照してください。

## GitHub Pages（公開準備のみ）

想定URL: https://ripple2371.github.io/react-pokemon-zukan/
詳細URL: https://ripple2371.github.io/react-pokemon-zukan/#/pokemon/25

Node.js 24で `npm ci`、`npm run build`、`npm run preview` を実行し、
`http://localhost:4173/react-pokemon-zukan/#/pokemon/25` を直接開いて再読み込みを確認します。
開発サーバーはベースパス `/`、本番ビルドとpreviewは `/react-pokemon-zukan/` です。
HashRouterのため、ルート部分は `#/pokemon/25` です。`/pokemon/25` をハッシュなしで公開URLに付ける方式は使いません。

公開はまだ行っていません。ワークフローはpush時には動かず、手動実行のみです。
ユーザーが公開を承認した後、PR #1 → #2 → 第12〜13章PRの順にmainへ統合し、
Settings → PagesのSourceをGitHub Actionsに設定してください。
その後ActionsのDeploy GitHub Pagesを **main** に対して手動実行します。
他ブランチではbuild jobがスキップされます。Pagesの設定変更・実行・本番確認にはユーザーの承認が必要です。

教材のpush自動公開トリガーは、確認前に公開しないため意図的に省略しています。
公開後も自動化が必要なら、承認後にmainのpushトリガーを追加してください。
