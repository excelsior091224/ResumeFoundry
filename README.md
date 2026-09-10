# ResumeFoundry

職務経歴書を入力して、プレビューと出力までを一貫して扱えるアプリです。Cloudflare Workers上で動作し、VPSは不要です。

## 概要

- 職務経歴書のフォーム入力(スキル・資格・自己PR・会社ごとの職歴とプロジェクト履歴など)
- サーバーサイドでのライブプレビュー
- PDF / DOCX ダウンロード
- Gemini APIによる職務要約のAI生成
- Astro + Cloudflare Workers(無料枠)構成。DBやログインは不要な一発生成型ツール

## 主要ディレクトリ

- [apps/resume-foundry](apps/resume-foundry) - Astro + Cloudflare Workersアプリ本体(このリポジトリで唯一のアプリケーション)
- [docs/design](docs/design) - 開発時の設計メモ・進捗記録(過去のLaravel版開発時のものを含む)

## 開発・確認コマンド

```bash
cd apps/resume-foundry
npm install
npm run dev       # Astro dev server (http://localhost:4321)
npm run build     # astro check && astro build
npm run preview   # wrangler dev でCloudflare Workersランタイムを再現してローカル確認
```

## デプロイ

```bash
cd apps/resume-foundry
wrangler login    # または CLOUDFLARE_API_TOKEN を設定
npm run build
npm run deploy
```

Gemini APIキーはWorkersのシークレットとして設定する(リポジトリには含めない)。

```bash
wrangler secret put GEMINI_API_KEY
```

詳細は [apps/resume-foundry/README.md](apps/resume-foundry/README.md) を参照。

## 旧Laravel版について

以前はLaravel + VPS(Docker/Caddy)構成で運用していましたが、Cloudflare Workers版への移行に伴い、Laravelアプリ本体とVPS向けDocker/デプロイ設定はリポジトリから削除しました。

過去のコードは、削除前のスナップショットとして付けたgitタグ `legacy-laravel-vps` から参照できます。

```bash
git show legacy-laravel-vps --stat   # 削除前の状態を確認
git checkout legacy-laravel-vps -- src docker docker-compose.yml docker-compose.prod.yml docker-compose.proxy.yml  # 必要であれば復元
```
