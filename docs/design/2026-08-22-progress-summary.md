# 2026-08-22 進捗サマリ（デプロイ復旧〜公開確認）

## 1. 今日の到達点

- 本番用Docker構成を追加し、VPSで`docker compose -f docker-compose.prod.yml up -d`まで到達。
- `pdo_sqlite`ビルド失敗を解消（`libsqlite3-dev`不足が原因）。
- 起動後の`500 Internal Server Error`を解消（`APP_KEY`未設定が原因）。
- VPS内部のHTTP疎通を確認（`curl -I http://127.0.0.1` が `200 OK`）。
- Cloudflareの`521`を切り分け・解消。
- Cloudflare SSL/TLSモードを`Flexible`から`Full (strict)`へ移行し、公開URLで表示確認。
- `resumefoundries.com` / `www.resumefoundries.com` の両方で画面表示を確認。
- `www -> @` の301リダイレクト方針を確定し、運用方針を整理。
- Googleフォームへ本番プライバシーポリシーURLを追記。

## 2. 実施した主な修正

### リポジトリ側

- `docker-compose.prod.yml` を追加・更新
  - 本番用サービス定義
  - 80/443公開
  - 本番envファイル読込
  - 永続化ボリューム設定
- `docker/php-apache/Dockerfile.prod` を追加・更新
  - Xdebugを除外
  - 本番向け拡張ビルド
  - `libsqlite3-dev`追加
  - `ssl`/`headers`モジュール有効化
- `docker/php-apache/entrypoint-prod.sh` を追加
  - 起動時の権限補正
  - SQLiteファイル生成
- `docker/php-apache/000-default-prod.conf` を更新
  - `ServerName`/`ServerAlias`を本番ドメインに設定
  - 443 VirtualHostを追加（Cloudflare Origin証明書想定）
- `src/app/Providers/AppServiceProvider.php` を更新
  - Vite hot file設定を`local`環境のみに限定

### インフラ側（VPS/Cloudflare）

- VPSで`80/tcp`待受・`ufw`許可を確認。
- Cloudflare DNSの`A`レコード（@/www）をVPS IPv4に設定。
- Cloudflare SSL/TLSを`Full (strict)`へ移行。
- 公開URL表示確認（アプリ画面表示）。

## 3. 重要な原因と学び

- Dockerビルド失敗の根因は、`pdo_sqlite`コンパイルに必要な`libsqlite3-dev`不足。
- 500エラーの根因は、`APP_KEY`が空のままコンテナ環境変数として渡っていたこと。
- `php artisan key:generate --show`で生成した値を`src/.env.production`へ明示反映し、`--force-recreate`で再作成する必要がある。

## 4. 現在の状態（終了時点）

- アプリは公開URLで表示される。
- `/privacy`ページ表示を確認済み。
- Cloudflare経由でアクセス可能。
- `www`リダイレクト方針は決定済み（ルール適用確認は翌朝の再チェック対象）。

## 5. 明日朝の再開手順（短縮版）

1. リダイレクト最終確認: `https://www.resumefoundries.com/privacy?x=1` が `https://resumefoundries.com/privacy?x=1` へ301で遷移するか確認。
1. 主要ページ疎通確認: `/`, `/privacy`, `/contact` の表示確認。
1. フォーム外部リンク確認: `GOOGLE_FORM_URL`のリンク遷移と、Googleフォーム内のプライバシーポリシーリンクを確認。
1. 軽い運用確認: `docker compose -f docker-compose.prod.yml ps`と`docker compose -f docker-compose.prod.yml logs --tail=100 app`を実行。
1. ドキュメント反映: 今日の確定事項を `docs/design/2026-08-22-deployment-progress.md` に最終追記。

## 6. 残タスク

- 必要であれば監視・バックアップ運用メモの追加。
