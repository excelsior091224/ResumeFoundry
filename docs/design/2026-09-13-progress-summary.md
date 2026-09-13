# 2026-09-13 開発進捗サマリ

## 1. 本日の目的

2026-09-12のプッシュ前レビューで判明した、データ損失、XSS、Clerk秘密鍵、本番デプロイ手順に関する問題を修正し、安全にリポジトリへ反映できる状態にする。

対象アプリは`apps/resume-foundry`配下のAstro + Cloudflare Workers + D1版Resume Foundryである。

## 2. 本日の到達点

- 前日のプッシュ前レビューで判明した問題をすべて修正した。
- D1スキーマを拡張し、フォーム項目の保存欠落を解消した。
- 認証済み編集画面と公開ジェネレーターのブラウザ下書きを分離した。
- ユーザー入力をJSONとしてHTMLへ埋め込む箇所へXSS対策を追加した。
- Clerk Secret keyをビルド成果物へ混入させないビルド処理を追加した。
- 本番Publishable keyがローカルDevelopmentキーより優先されることを確認した。
- リモートD1マイグレーションを含む安全なデプロイ順序を整備した。
- ローカルD1へのマイグレーション適用と全項目の保存・復元テストを完了した。
- 最終コードレビューで「コミット・プッシュ可能」と判定された。
- 変更をコミットし、`origin/main`へ反映した。

## 3. 修正内容

### 3.1 D1編集画面とローカル下書きの分離

#### 問題

公開用の登録不要ジェネレーターと、認証済みD1編集画面が同じ`localStorage`キーを使用していた。

ブラウザに古い下書きがある場合、D1から読み込んだ職歴より下書きが優先され、そのまま保存するとD1の正式データを意図せず上書きする可能性があった。

#### 対応

フォーム初期化データへ`persistLocalDraft`を追加した。

- `/resume`: `persistLocalDraft: true`
- `/app/careers`: `persistLocalDraft: false`

認証済み編集画面では次の動作を無効にした。

- `localStorage`からの下書き読込
- `localStorage`への自動保存
- 下書きクリアボタン

認証済み編集画面では、D1から取得したデータを常に初期値として使用する。

主な変更:

- `../../apps/resume-foundry/src/scripts/resume-form.ts`
- `../../apps/resume-foundry/src/pages/resume/index.astro`
- `../../apps/resume-foundry/src/pages/app/careers.astro`

### 3.2 D1スキーマと保存処理の拡張

次のマイグレーションを追加した。

- `../../apps/resume-foundry/db/migrations/0003_expand_resume_fields.sql`

追加カラム:

```text
companies.industry
companies.established
companies.capital
companies.employees
projects.role_custom
links.link_type
links.link_type_custom
```

これにより、次の値が保存・再読込後も維持される。

- 会社の業種
- 設立
- 資本金
- 従業員数
- 「その他」を選択したプロジェクト役割
- 「その他」を選択したリンク種別

既存データとの互換性を保つため、旧形式で保存されたリンク・役割についても、既知の選択肢に含まれない値を「その他」として復元する処理を追加した。

主な変更:

- `../../apps/resume-foundry/src/features/careers/db.ts`
- `../../apps/resume-foundry/db/migrations/0003_expand_resume_fields.sql`

### 3.3 JSON埋め込みのXSS対策

#### 問題

D1由来のユーザー入力を`JSON.stringify()`した後、`<script type="application/json">`へ`set:html`で直接挿入していた。

入力に`</script>`が含まれる場合、script要素を途中で終了できるため、保存型XSSにつながる可能性があった。

#### 対応

HTML内へJSONを埋め込む専用関数`serializeJsonForHtml()`を追加した。

次の文字をUnicodeエスケープする。

- `<`
- `>`
- `&`
- U+2028
- U+2029

適用箇所:

- 公開ジェネレーターの初期データ
- D1職歴編集画面の初期データ
- D1プレビュー画面の職歴データ

主な変更:

- `../../apps/resume-foundry/src/features/resume/serialize.ts`
- `../../apps/resume-foundry/src/pages/resume/index.astro`
- `../../apps/resume-foundry/src/pages/app/careers.astro`
- `../../apps/resume-foundry/src/pages/app/preview.astro`

### 3.4 Clerk秘密鍵を含めないビルド

#### 問題

通常のAstroビルド時に`.dev.vars`が読み込まれ、`CLERK_SECRET_KEY`が生成済みWorker JavaScriptへ埋め込まれることを確認した。

`dist`はGit管理対象外だが、そのままWorkerへデプロイするとDevelopment用Secret keyを配信バンドルへ含める危険があった。

#### 対応

安全なビルドラッパーを追加した。

- `../../apps/resume-foundry/scripts/build.mjs`

ビルド時の処理:

1. `.dev.vars`が存在する場合、ビルド中だけ一時退避する。
2. ブラウザ用の`PUBLIC_CLERK_PUBLISHABLE_KEY`だけをAstroへ渡す。
3. `CLERK_SECRET_KEY`はビルド環境へ渡さない。
4. `astro check`を実行する。
5. `astro build`を実行する。
6. 成否にかかわらず`.dev.vars`を元の場所へ戻す。

本番ビルドで環境変数としてPublishable keyが明示された場合は、`.dev.vars`のDevelopmentキーより明示値を優先する。

### 3.5 ビルド成果物の秘密鍵検査

次の検査スクリプトを追加した。

- `../../apps/resume-foundry/scripts/assert-no-secrets.mjs`

`dist`内のテキスト成果物を走査し、次の形式を検出した場合はビルドを失敗させる。

```text
sk_test_...
sk_live_...
```

`npm run build`は現在、次の順で動作する。

```text
安全な環境変数でastro check
  ↓
安全な環境変数でastro build
  ↓
生成物のClerk Secret key検査
```

### 3.6 デプロイ順序の修正

`npm run deploy`を次の順序へ変更した。

```text
npm run build
  ↓
npm run db:migrate:remote
  ↓
wrangler deploy
```

これにより、必要なD1カラムが存在しない状態で新しいWorkerコードだけが先に公開されることを防ぐ。

マイグレーションに失敗した場合、後続のWorkerデプロイは実行されない。

## 4. 検証結果

### 4.1 Astro / TypeScript

```text
npm run build
Result: 0 errors / 0 warnings / 0 hints
Astro server build: success
```

### 4.2 Clerk秘密鍵

```text
Build output contains no Clerk secret keys.
```

次も確認した。

- `.dev.vars`はビルド後に元の場所へ復元される。
- 明示指定したProduction Publishable keyがDevelopmentキーより優先される。
- ステージ済み差分に実際のClerkキーは含まれていない。

### 4.3 D1マイグレーション

ローカルD1へ`0003_expand_resume_fields.sql`を適用した。

```text
0003_expand_resume_fields.sql: success
Pending local migrations: none
```

### 4.4 D1保存・復元

次の値を含むテストデータをD1へ保存し、取得結果が入力ペイロードと完全一致することを確認した。

- 会社情報4項目
- カスタム雇用形態
- カスタムリンク種別
- カスタムプロジェクト役割
- スキル
- 資格
- 自己PR
- 配慮事項
- 担当工程
- 使用技術
- `</script>`を含む文字列

結果:

```text
D1 full payload roundtrip: matches=true
```

### 4.5 JSONエスケープ

攻撃文字列を含むデータで次を確認した。

```text
生の </script> を含まない: true
JSON.parse後に元データと一致: true
```

### 4.6 最終レビュー

全ステージ済み差分を再レビューした。

```text
重大な残存問題: なし
必要な新規ファイル: すべてコミット対象
秘密情報: 検出なし
コミット・プッシュ可否: Yes
```

## 5. Git状態

本日の変更は次のコミットへ含まれている。

```text
9c01316d Add authenticated D1 career management
```

2026-09-13 10:17 UTC時点:

```text
branch: main
HEAD: 9c01316d
origin/main: 9c01316d
working tree: clean（本書作成前）
```

コミットには次が含まれる。

- Clerk認証
- D1職歴保存
- プロジェクト0件対応
- D1スキーマ拡張
- JSON XSS対策
- 安全なビルド・Secret検査
- デプロイ順序修正
- 進捗文書

## 6. 現在の注意事項

### 6.1 本番D1マイグレーションは未確認

ローカルD1への適用は完了しているが、リモートD1への次のマイグレーション適用は未確認である。

- `0002_add_profile_fields.sql`
- `0003_expand_resume_fields.sql`

本番デプロイ前にCloudflareアカウントと対象D1を確認する。

### 6.2 本番デプロイは未実施

本日の作業はリポジトリ反映までであり、Cloudflare Workers本番環境へのデプロイは行っていない。

### 6.3 Clerk Production設定

DevelopmentインスタンスでGoogle/GitHubログインは確認済みだが、本番公開前に次が必要。

- Clerk Productionインスタンスの有効化
- `resumefoundries.com`のドメイン設定
- Production Publishable keyのビルド環境設定
- Production Secret keyのCloudflare Secret登録
- Google/GitHubの本番OAuth接続
- 許可URLとリダイレクトURLの確認

### 6.4 保存方式

職歴保存は現在、ユーザー配下の会社・案件・スキル等を全削除して再登録する全件置換方式である。

単一ユーザーが一つの画面から更新するMVPでは動作するが、次には未対応。

- 複数タブからの同時更新
- 更新競合検出
- 変更履歴
- 部分更新
- 誤操作からの復元

### 6.5 Clerkユーザー同期

現在は認証済みユーザーがアプリへアクセスした時にD1ユーザーを作成・更新する遅延同期方式である。

Clerk側でのユーザー更新・削除をD1へ同期するWebhookは未実装。

### 6.6 依存関係監査

直接依存のWranglerは4.131.1へ更新済み。

`npm audit`には、`@astrojs/cloudflare`が内部で固定している開発用Wrangler/Miniflare/Sharp由来のHigh advisoryが残っている。Clerk由来ではない。

Cloudflare Adapterの修正版が公開されたら更新して再監査する。

## 7. 今後やること

### P0: 本番前設定とデプロイ

1. CloudflareとClerkのProduction設定を確認する。
2. `PUBLIC_CLERK_PUBLISHABLE_KEY`へProductionキーを設定する。
3. Cloudflare Workersへ`CLERK_SECRET_KEY`をSecretとして登録する。
4. 必要なら`GEMINI_API_KEY`もSecretとして登録する。
5. リモートD1のバックアップまたは復元手段を確認する。
6. `npm run deploy`を実行する。
7. リモートマイグレーションの成功を確認する。
8. Workerのデプロイ成功を確認する。

### P0: 本番スモークテスト

本番URLで次を確認する。

1. Googleログイン
2. GitHubログイン
3. ログアウト
4. 未認証時の`/app`保護
5. 会社・職歴の保存
6. プロジェクト0件の保存
7. ページ再読込後の復元
8. カスタムリンク種別・役割の復元
9. PDF出力
10. DOCX出力
11. 別ユーザー間のデータ分離

### P1: 自動テスト

現在の手動検証を再現できる自動テストを追加する。

優先ケース:

- D1全項目roundtrip
- プロジェクト0件
- カスタム選択肢
- JSON script escaping
- 未認証API 401
- 異なるOriginのPOST 403
- ユーザー間のデータ分離
- ビルド成果物のSecret検査
- Production Publishable key優先

### P1: Clerk Webhook

次のイベントを署名検証したうえでD1へ反映する。

- `user.created`
- `user.updated`
- `user.deleted`

削除時の方針を先に決める。

- 即時物理削除
- 論理削除後、猶予期間を経て物理削除
- ユーザーによる事前エクスポート

### P1: データ保護・運用機能

- アカウント削除
- 全保存データ削除
- JSON等によるデータエクスポート
- D1バックアップ・復元手順
- 利用規約
- プライバシーポリシー
- 障害時のユーザー向けエラー表示

### P1: 更新競合対策

プロフィールまたは職歴全体へバージョン番号を追加し、保存時に楽観的ロックを行う。

古い画面から保存しようとした場合はHTTP 409を返し、再読込または差分確認を促す。

### P2: データモデル整理

現在、担当工程と使用技術は既存の次の列へ保存している。

```text
processes → projects.responsibilities
technologies → projects.achievements
```

値は失われないが、列名と意味が一致していない。将来の検索・集計を考え、専用カラムまたは正規化テーブルへ移行する。

### P2: プロダクト拡張

- 職歴の部分更新
- 更新履歴と復元
- 職歴・案件の並べ替え
- 複数の職務経歴書テンプレート
- R2を利用した期限付きエクスポート
- AI生成履歴と利用量制御
- 課金プランと利用上限

## 8. 次回開始手順

```bash
cd /workspaces/LaravelResumeGenerationSystem/apps/resume-foundry

git status --short
git log -1 --oneline
npm install
npm run db:migrate:local
npm run build
```

本番作業を行う場合は、Developmentキーを使用していないことを確認してから実行する。

```bash
export PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
npx wrangler secret put CLERK_SECRET_KEY
npm run deploy
```

秘密鍵はコマンド引数、Git、ドキュメント、Issue、チャットへ記載しない。

## 9. 次のマイルストーン

次のマイルストーンは、以下をすべて満たす状態とする。

- Clerk Production環境でGoogle/GitHub認証が動作する。
- リモートD1へ全マイグレーションが適用されている。
- 本番環境で全フォーム項目が欠落なく保存・復元される。
- プロジェクト0件の職歴が正常に保存・出力できる。
- ユーザー間でデータが分離される。
- PDF/DOCXが正常に出力される。
- Secret keyがビルド成果物に含まれない。
- 主要な認証・保存・セキュリティ境界が自動テストされている。
