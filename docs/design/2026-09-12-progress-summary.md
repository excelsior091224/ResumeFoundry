# 2026-09-12 開発進捗サマリ

## 1. 文書の目的

Astro + Cloudflare Workers + Cloudflare D1へ移行したResume Foundryについて、2026-09-12時点の実装状況、確認済みの挙動、未完了事項、次回以降の優先タスクをまとめる。

過去の`docs/design`にはLaravel/VPS版を前提とした文書が残っている。現在の実装対象は`apps/resume-foundry`配下のAstroアプリであり、本書の内容を現行構成の基準とする。

## 2. 現在のシステム構成

```text
ブラウザ
  ├── Clerk（メールアドレス、Google、GitHub、セッション管理）
  └── Astro SSR
        └── Cloudflare Workers
              ├── Cloudflare D1（ユーザー、職歴、案件、スキル、資格、リンク）
              ├── R2（将来の一時エクスポート保存用）
              └── Gemini API（任意の職務要約生成）
```

主要技術:

- Astro 7
- `@astrojs/cloudflare`
- Cloudflare Workers
- Cloudflare D1
- Clerk Astro SDK 4
- `pdf-lib`
- `docx`
- TypeScript

## 3. 本日の到達点

### 3.1 D1を利用した保存型職歴管理

次の画面をD1の保存データへ接続した。

- `/app`: キャリアダッシュボード
- `/app/careers`: 職歴・案件・スキル・資格の編集と保存
- `/app/preview`: 保存済みデータのプレビューとPDF/DOCX出力

実装箇所:

- `../../apps/resume-foundry/src/features/careers/db.ts`
- `../../apps/resume-foundry/src/pages/api/careers/index.ts`
- `../../apps/resume-foundry/src/pages/app/index.astro`
- `../../apps/resume-foundry/src/pages/app/careers.astro`
- `../../apps/resume-foundry/src/pages/app/preview.astro`

D1へ保存するプロフィール項目として、次のカラムを追加した。

- `self_pr`
- `considerations`
- `as_of_date`

マイグレーション:

- `../../apps/resume-foundry/db/migrations/0002_add_profile_fields.sql`

### 3.2 プロジェクトがない職歴への対応

会社に紐づくプロジェクトを必須としないよう変更した。

- 新規会社の`projects`初期値を空配列へ変更
- プロジェクト名のHTML `required`を削除
- 最後のプロジェクトも削除可能に変更
- ドラフト復元時に空プロジェクトを自動追加しないよう変更
- プロジェクト0件の会社をD1へ保存・復元可能に変更
- HTML、PDF、DOCXでプロジェクト0件を安全に描画

これにより、特定の案件単位ではなく、一般事務、総務、管理業務などを会社単位で記録できる。

### 3.3 Clerk認証とソーシャルログイン

当初の計画に従い、認証基盤としてClerkを採用した。

実装内容:

- `@clerk/astro` 4.1.1を導入
- `clerkMiddleware()`を設定
- Clerkの`SignIn`、`SignUp`、`UserButton`を導入
- 多段階認証フローに対応するキャッチオールルートを作成
- `/app`配下を認証必須化
- `/api/careers`のGET/POSTを認証必須化
- 未認証APIアクセスはHTTP 401を返す
- 職歴更新APIへ同一オリジン検証を追加
- Clerkの`userId`をD1上のデータ所有者IDとして使用
- 初回アクセス時にClerkユーザーをD1の`users`、`profiles`へ同期
- 固定デモユーザーへの保存処理を廃止

主要ファイル:

- `../../apps/resume-foundry/astro.config.mjs`
- `../../apps/resume-foundry/src/middleware.ts`
- `../../apps/resume-foundry/src/pages/auth/login/[...rest].astro`
- `../../apps/resume-foundry/src/pages/auth/register/[...rest].astro`
- `../../apps/resume-foundry/src/layouts/BaseLayout.astro`
- `../../apps/resume-foundry/src/features/careers/db.ts`
- `../../apps/resume-foundry/src/pages/api/careers/index.ts`

Clerk Developmentインスタンスでは、次の認証方法が画面に表示されることを確認した。

- メールアドレスとパスワード
- Google
- GitHub

実際にソーシャル認証を行い、ログイン後に`/app`のダッシュボードが表示されること、およびClerkのユーザーアイコンがヘッダーに表示されることを確認済み。

## 4. 認証とデータ分離の設計

Clerkは次の責務を持つ。

- パスワードとOAuth資格情報の管理
- メールアドレス確認
- Google/GitHubなどのソーシャル認証
- セッション発行、検証、失効
- ユーザープロフィールUI

D1は次の責務を持つ。

- ClerkユーザーIDとローカルユーザー行の対応
- プロフィール、会社、案件、スキル、資格、リンクの永続化
- 全データの`user_id`による所有者分離

保護ページは各Astroページで`Astro.locals.auth()`を確認する。保護APIも各ハンドラーで認証状態を確認する。パスのパターンだけに依存するミドルウェア保護は使用せず、データへアクセスするリソース自身が認証を要求する。

```text
Clerk session
    ↓
locals.auth()
    ↓
Clerk userId
    ↓
D1 users.id / provider_subject
    ↓
companies・projects・skills等のuser_id
```

## 5. 環境変数と秘密情報

ローカル開発では`apps/resume-foundry/.dev.vars`に次の値を設定する。

```env
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

`.dev.vars`はGit管理対象外であり、秘密鍵の値をGit、ドキュメント、Issue、チャットへ記録しない。

テンプレートとして次のファイルを追加した。

- `../../apps/resume-foundry/.dev.vars.example`

本番ではDevelopmentキーを使用せず、Clerk Productionインスタンスの`pk_live_...`と`sk_live_...`を使用する。

## 6. 動作確認結果

2026-09-12に次を確認した。

### ビルド

```text
npm run build
Result: 0 errors / 0 warnings / 0 hints
Astro server build: success
```

### Clerk

```text
/auth/register: HTTP 200
Google認証ボタン: 表示
GitHub認証ボタン: 表示
未認証 /app: /auth/loginへリダイレクト
未認証 GET /api/careers: HTTP 401
ソーシャルログイン後 /app: 表示成功
UserButton: 表示成功
```

### D1と帳票

プロジェクト0件の会社データで次を確認した。

```text
POST /api/careers: 保存成功
GET /api/careers: 復元成功
PDF生成: 成功
DOCX生成: 成功
```

## 7. 現在の注意事項

### 7.1 本番環境には未反映

本日の変更はローカル作業ツリーにあり、コミット、リモートD1マイグレーション、本番デプロイは未実施。

本番反映前に必ず変更内容をレビューし、マイグレーションをコードより先に適用する。

### 7.2 Clerk Production設定は未実施

現在確認できているのはClerk Developmentインスタンスである。本番公開前に次が必要。

- Productionインスタンスの有効化
- `resumefoundries.com`のドメイン設定
- 本番用Publishable keyとSecret keyの登録
- Google/GitHubの本番OAuth設定
- Clerk Dashboard上の許可URL、リダイレクトURLの確認
- Developmentキーが本番環境へ混入していないことの確認

### 7.3 Clerkユーザー同期は遅延作成方式

現状は、認証済みユーザーがアプリへ初回アクセスした時点でD1ユーザーを作成する。Clerk側でユーザーを更新・削除した場合のD1同期Webhookは未実装。

### 7.4 D1項目とフォーム項目に差分がある

2026-09-13に`0003_expand_resume_fields.sql`を追加し、会社の業種・設立・資本金・従業員数と、「その他」のリンク種別・プロジェクト役割を保存できるようにした。

引き続き確認が必要な項目:

- プロジェクトの担当工程と使用技術を専用列として分離すること
- プロジェクトの実績・工夫・課題をフォーム定義と同じ意味で保持すること

担当工程と使用技術は既存の`responsibilities`、`achievements`へ保存しており、値は保持されるが、DB上の列名と意味が一致していない。次回のスキーマ整理時に専用列へ移行する。

### 7.5 保存処理は全件置換

職歴保存時は、そのユーザーのリンク、スキル、資格、案件、会社を削除してから再登録する。MVPとしては単純だが、同時更新、部分更新、履歴保持には対応していない。

### 7.6 依存関係監査

直接依存のWranglerは4.131.1へ更新した。

`npm audit`には、`@astrojs/cloudflare`が内部で固定している開発用Wrangler/Miniflare/Sharp経由のHigh advisoryが4件残っている。Clerk由来ではない。Cloudflare Adapterの修正版が公開された時点で更新し、再監査する。

## 8. 次回以降の優先タスク

### P0: 現在の変更を安全に確定する

1. 2026-09-13のプッシュ前修正を含めてGit差分を再レビューする。
2. ローカルD1のテストデータを確認する。
3. 変更を論理単位でコミットする。
4. リモートD1へ`0002_add_profile_fields.sql`と`0003_expand_resume_fields.sql`を適用する。
5. Cloudflare Workersへデプロイする。
6. 本番URLで認証、保存、PDF、DOCXをスモークテストする。

想定コマンド:

```bash
cd apps/resume-foundry
npm run build
npm run db:migrate:remote
npm run deploy
```

### P0: Clerk本番設定を完了する

1. Clerk Productionインスタンスを構成する。
2. Google/GitHubの本番OAuth資格情報を設定する。
3. Cloudflareへ`CLERK_SECRET_KEY`をSecretとして登録する。
4. ビルド環境とWorker環境へ`PUBLIC_CLERK_PUBLISHABLE_KEY`を設定する。
5. 本番ドメインとリダイレクト先を確認する。
6. ログイン、ログアウト、セッション期限切れを確認する。

### P0: D1スキーマの情報欠落を解消する

フォームの`ResumePayload`とD1スキーマの対応表を作成し、保存・復元で値が失われる項目を洗い出す。

追加マイグレーションを作成し、次の往復を自動テストする。

```text
フォーム入力
  → validateResumePayload
  → D1保存
  → D1読込
  → 元のResumePayloadと同値
```

### P1: Clerk Webhookを実装する

対象イベント:

- `user.created`
- `user.updated`
- `user.deleted`

Webhook署名を検証し、メールアドレス・表示名・削除状態をD1へ同期する。ユーザー削除時に職歴データを即時削除するか、猶予期間を設けるかはプライバシーポリシーと合わせて決定する。

### P1: 自動テストを追加する

最低限必要なテスト:

- 未認証ページのリダイレクト
- 未認証APIの401
- 認証済みユーザーのGET/POST
- 異なるユーザー間でのD1データ分離
- 異なるOriginからの更新拒否
- プロジェクト0件の保存・復元
- プロジェクト0件のHTML/PDF/DOCX生成
- 全フォーム項目のD1往復

Clerk本体をE2Eテストで直接操作するのではなく、アプリ側の認証境界はテスト用トークンまたはClerk推奨のテスト方式を利用する。

### P1: 運用・プライバシー機能

- アカウント削除
- 保存データの一括削除
- データエクスポート
- 利用規約
- プライバシーポリシー
- 障害時のバックアップ・復元手順
- D1バックアップ方針
- Clerk障害時のユーザー向け表示

### P2: プロダクト機能

- 職歴の部分更新
- 複数の職務経歴書テンプレート
- 職歴・案件の並べ替え
- 保存履歴と差分
- R2を使った期限付きエクスポート
- AI要約の生成履歴、同意、利用量制御
- 課金プランと利用上限

## 9. 次回開始時の確認手順

```bash
cd /workspaces/LaravelResumeGenerationSystem/apps/resume-foundry

git status --short
npm install
npm run db:migrate:local
npm run build
npm run dev
```

ブラウザで次を確認する。

1. `/auth/login`にGoogle/GitHubが表示される。
2. ログイン後に`/app`へ遷移する。
3. `/app/careers`で会社を追加する。
4. プロジェクト0件のまま保存する。
5. ページ再読込後もデータが残る。
6. `/app/preview`からPDF/DOCXを生成する。
7. ログアウト後に`/app`へ戻れない。

## 10. 完了条件

現時点では「ローカル環境で認証済みユーザーが自分専用の職歴を保存し、プレビュー・PDF・DOCXへ出力できるMVP」まで到達している。

次のマイルストーンは、「フォーム項目を欠落なくD1へ保存でき、Clerk Production設定済みのCloudflare Workers本番環境で安全に運用できる状態」とする。

## 11. 2026-09-13 プッシュ前修正

前日のプッシュ前レビューで判明した問題を修正した。

- 認証済みD1編集画面では、公開ジェネレーター用`localStorage`下書きを読み書きしないよう分離
- `0003_expand_resume_fields.sql`を追加し、会社情報とカスタム選択値を欠落なく保存
- D1保存後の全項目往復テストで入力ペイロードとの完全一致を確認
- JSONを`<script type="application/json">`へ埋め込む前に`<`、`>`、`&`等をUnicodeエスケープ
- `</script>`を含む保存値がHTMLを脱出せず、JSONとして元の値へ復元できることを確認
- Clerk Secret keyを読み込まない安全なビルドラッパーを追加
- ビルド成果物に`sk_test_...`または`sk_live_...`があれば失敗する検査を追加
- 明示指定した本番Publishable keyが`.dev.vars`のDevelopmentキーより優先されることを確認
- `npm run deploy`を、安全なビルド、秘密鍵検査、リモートD1マイグレーション、Workerデプロイの順に変更

検証結果:

```text
npm run build: 成功
Astro check: 0 errors / 0 warnings / 0 hints
Clerk secret bundle scan: 検出なし
ローカルD1 migration: 適用済み
D1全項目roundtrip: 完全一致
JSON script escaping: 成功
```
