# GitHub Pagesで公開する

このプロジェクトには `.github/workflows/pages.yml` を同梱しています。`main` への更新時に、依存関係の導入、ビルド、全テスト、公開用ファイルの確認、GitHub Pagesへの公開を順に実行します。プルリクエストでは検証だけを実行します。

## 初回の設定

1. GitHubで、このプロジェクト用の空のリポジトリを作成します。名前の例は `machikado-menu-catalog`。無料アカウントでGitHub Pagesを使う場合は Public を選びます。既存リポジトリを使う場合は、このプロジェクト専用のものを選んでください。
2. このフォルダーの内容をリポジトリ直下にアップロードします。`package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`.github/workflows/pages.yml`、`src`、`app`、`components`、`hooks`、`lib`、`public`、`scripts`、`tests`、設定ファイルを含めます。`dist` や `node_modules` をアップロードする必要はありません。`.github` フォルダーも忘れずに含めてください。
3. GitHubのリポジトリで **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に変更します。
4. **Actions → Deploy to GitHub Pages → Run workflow** を開き、ブランチ `main` で実行します。以後は `main` へのpushで自動更新されます。
5. 実行結果の **Publish site** または **Settings → Pages** に表示されるURLを開きます。通常のプロジェクト用URLは `https://<GitHubユーザー名>.github.io/<リポジトリ名>/` です。

GitHub Pages本体への設定・公開は、公開先リポジトリで行ってください。この文書を追加しただけでは、GitHub側の公開は開始されません。

## Gitを使ってアップロードする場合

以下のURLを自分の空のリポジトリURLに置き換え、プロジェクトのフォルダーで実行します。`github` という名前の接続先を既に登録している場合は、追加せずその接続先を使います。

```sh
git add .
git commit -m "Configure GitHub Pages publishing"
git remote add github https://github.com/YOUR-NAME/machikado-menu-catalog.git
git push -u github HEAD:main
```

変更が既にコミット済みの場合、最初の2行は不要です。既存の履歴があるリポジトリでpushが拒否されたら、その履歴を確認してください。強制pushは不要です。GitHubへの認証はGit Credential Managerなどの通常のログイン機能を使います。公開ワークフロー用の個人アクセストークンやAPIキーは不要です。

## 公開される内容と保存データ

公開対象は `dist` の静的ファイルだけです。315店舗と全商品の情報は、GitHub Pagesの閲覧者に表示されます。GitHub Pages上のサイトは一般に公開され、Sitesの所有者限定アクセス設定は引き継がれません。

お気に入り・卓のGMメモ・閲覧履歴は利用者のブラウザ内に保存され、公開ファイルには入りません。SitesからGitHub Pagesへ移る場合は別の保存領域になるため、旧サイトの「セッション管理」で保存ファイルを書き出し、新サイトで読み込んでください。

`.openai/hosting.json` は既存のSites用設定です。GitHub Pagesの公開には使用せず、ワークフローの公開物にも含みません。

## 動作とローカル確認

- Node.js 24とpnpm 11.19.0を使用します。pnpmの版は `package.json` の `packageManager` で固定しています。
- `pnpm install --frozen-lockfile` でロックファイルの依存関係を使います。
- Viteの `base: './'` を利用するため、リポジトリ名を書き込む設定は不要です。プロジェクト用サブディレクトリ、ユーザーサイトのルート、カスタムドメインに対応します。
- 店舗URLは `#/shop/...`、PL用URLは `#/menu/...` です。再読込時も `index.html` を使うため、404ページへの転送は不要です。
- 通常表示は「現代」。各時代の30店舗も同じサイトで選択できます。

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm check:pages
pnpm start
```

`check:pages` はビルドしたJS・CSS・画像と全カテゴリのデータを調べ、ルート公開とリポジトリ配下のURLの両方で参照先が正しいことを確認します。GitHub上の実行や画面操作を代わりに行うものではありません。

## 公開できないとき

- **Pagesが見つからない／Configure Pagesが失敗する**：Settings → PagesのSourceがGitHub Actionsになっているか確認します。
- **権限エラー**：リポジトリや組織でGitHub ActionsとGitHub Pagesが許可されているか確認します。
- **公開待ちになる**：Settings → Environments → github-pagesの承認・ブランチ制限を確認します。
- **Run workflowが見つからない**：`.github/workflows/pages.yml` がデフォルトブランチに入っているか確認します。この設定の公開ブランチは `main` です。
- **ビルド／テストが失敗する**：Actionsの失敗した手順を開き、最初のエラーを確認します。検証が失敗した場合、公開処理は実行されません。

## 公式資料

- [GitHub Pagesのカスタムワークフロー](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub Pagesについて](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages)
- [Viteの静的デプロイ](https://vite.dev/guide/static-deploy.html#github-pages)
- [pnpm/action-setup](https://github.com/pnpm/action-setup)
