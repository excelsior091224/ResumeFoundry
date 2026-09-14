# 2026-09-14 開発進捗サマリ

## 1. 本日の到達点

- ClerkのProductionインスタンスを作成した。
- Clerk Productionのドメイン認証を完了した。
- Google/GitHubのProduction OAuthアプリとSSO connectionを設定した。
- Clerk Secret keyとGemini API keyをCloudflare Worker Secretへ登録した。
- Cloudflare Workersへ本番デプロイした。
- アプリ側の認証実装は既にClerkへ接続済みであり、Productionインスタンス作成に伴うコード変更は不要である。

### 本番公開後の外部スモークテスト

2026-09-14に次を確認した。

- `https://resumefoundries.com/`: HTTP 200
- `https://resumefoundries.com/auth/login`: HTTP 200
- `https://resumefoundries.com/auth/register`: HTTP 200
- 未認証の`/app`: `/auth/login`へHTTP 307
- 未認証の`/api/careers`: HTTP 401
- `https://www.resumefoundries.com/`: HTTP 301

Clerkのログイン・登録UIにGoogle/GitHubボタンが表示されることも確認した。

### 本番機能テスト

次の操作が本番環境で成功した。

- Googleによる新規登録・ログイン
- 認証後の`/app`表示
- プロジェクト0件を含む職歴の保存・再読込
- PDF出力
- DOCX出力
- GeminiによるAI職務要約

リモートD1を読み取り専用クエリで確認し、最初のユーザーについて次の保存件数を確認した。

```text
users: 1
companies: 2
projects: 1
skills: 2
```

GitHub認証も成功したが、GoogleとGitHubの登録メールアドレスが同一だったため、Clerkが両方のOAuth接続を同じユーザーへリンクした。これはアカウント重複を防ぐ正常な動作であり、D1でも同じClerk user IDとして扱われる。

その後、異なるメールアドレスの新しいGitHubアカウントで登録し、次を確認した。

- 新しいClerkユーザーとして登録される。
- 新規ユーザーのダッシュボードは会社、案件、スキル、資格、リンクがすべて0件で表示される。
- 最初のユーザーが保存した会社2件は表示されない。
- リモートD1の`users`は2件になる。
- 会社2件は最初のユーザーだけに紐づき、新規ユーザーには会社データが存在しない。

以上により、Clerk user IDを所有者とするD1データ分離が本番環境で機能することを確認した。

## 2. 本番デプロイ後に残っている確認

- Clerk DashboardのProductionインスタンスで利用状況が計測されることを確認する。

## 3. デプロイ手順

```bash
cd /workspaces/LaravelResumeGenerationSystem/apps/resume-foundry

npx wrangler login

read -r -p 'Clerk Production Publishable key: ' PUBLIC_CLERK_PUBLISHABLE_KEY
export PUBLIC_CLERK_PUBLISHABLE_KEY

npx wrangler secret put CLERK_SECRET_KEY
# AI要約を本番で利用する場合のみ:
npx wrangler secret put GEMINI_API_KEY

npx wrangler d1 migrations list astro-resume-foundry --remote
npm run deploy
```

Secretの実値はGit、ドキュメント、Issue、チャット、コマンド引数へ記録しない。Production Publishable keyは`pk_live_...`であることを確認し、Developmentキーと混在させない。

`npm run deploy`は、安全なビルド、Clerk Secret混入検査、リモートD1マイグレーション、Workerデプロイの順に実行する。

## 4. デプロイ後の確認

- [x] `https://resumefoundries.com`が表示される。
- [x] `/auth/register`と`/auth/login`が表示される。
- [x] GoogleログインがProduction環境で成功する。
- [x] GitHub OAuth接続が同一メールの既存ユーザーへ正常にリンクされる。
- [x] 未認証で`/app`へアクセスするとログインへ移動する。
- [x] 職歴の保存・再読込が成功する。
- [x] プロジェクト0件の会社を保存できる。
- [x] 異なるメールアドレスの別ユーザーから既存ユーザーのD1データが表示されない。
- [x] PDF/DOCX出力が成功する。
- [x] AI要約が成功する。
- [ ] Clerk DashboardのProductionインスタンスで利用状況が計測される。

## 5. 未完了の中長期課題

- Clerk Webhookによるユーザー削除・更新同期
- アカウント削除とデータエクスポート
- 利用規約・プライバシーポリシー
- 自動テストの追加
- D1バックアップ・復元手順

## 6. Clerk Production設定の補足

### APIキーの保存先

- `pk_live_...`（Publishable key）はブラウザへ公開されるキーである。デプロイ時に`PUBLIC_CLERK_PUBLISHABLE_KEY`環境変数としてビルドへ渡す。
- `sk_live_...`（Secret key）は公開してはいけない。`npx wrangler secret put CLERK_SECRET_KEY`でCloudflare Worker Secretへ登録する。
- Secret keyを`.astro`、`src/`、Git、チャット、コマンド引数へ書かない。
- `.dev.vars`はDevelopment用であり、本番Secretの保存先にはしない。

### 「未認証」と表示される場合

Clerk DashboardのDomainsに`resumefoundries.com`を追加しただけでは完了しない。画面の`DNS configuration`に表示される全レコードを、ドメインを管理しているDNS（Cloudflareなど）へ追加する。

- Clerk画面の`Configure automatically`を使える場合はそれを利用する。
- 手動設定の場合は、Clerkが表示したホスト名・値をそのまま登録する。
- CloudflareのClerk用CNAMEは`DNS only`（プロキシ無効）にする。
- DNS反映には最大48時間かかる場合がある。
- すべてのレコードがVerifiedになった後、Clerk Dashboardの`Deploy certificates`を実行する。

アプリのドメインとClerk Frontend API用ドメインは、Clerk画面で要求される用途に従って設定する。OAuthのコールバックURLは推測せず、各SSO connection画面に表示される値を使う。

### Production Google/GitHubログイン

ProductionインスタンスではDevelopmentの共有OAuth資格情報は使えない。Clerk DashboardでProductionを選択し、次を行う。

1. `Configure → User & authentication → SSO connections`を開く。
2. GoogleまたはGitHubを追加・有効化する。
3. `Use custom credentials`を選択する。
4. Clerkが表示するRedirect URI（GitHubではAuthorization callback URL）をコピーする。
5. Google Cloud ConsoleまたはGitHub Developer SettingsでOAuthアプリを作成し、コピーしたURLを登録する。
6. 発行されたClient IDとClient SecretをClerkの該当SSO connectionへ入力して保存する。

Redirect URIはプロバイダーごと・インスタンスごとに異なるため、`resumefoundries.com/auth/login`をRedirect URIとして登録しない。ClerkがSSO connection画面に表示するURLを登録する。
