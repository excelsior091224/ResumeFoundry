# 2026-08-22 本番環境デプロイ進捗

## 1. 現在の構成

- ドメイン: `resumefoundries.com`
- DNS管理: Cloudflare
- 本番候補サーバー: ConoHa VPS
- VPS OS: Ubuntu 26.04 LTS
- VPS IPv4: `VPSのIPv4アドレス`
- VPSメモリ: 約2GB
- VPS Swap: 2GB
- VPSディスク: 約99GB
- リポジトリ: `https://github.com/excelsior091224/LaravelResumeGenerationSystem.git`

## 2. 完了した作業

### VPSへの接続

SSH接続がタイムアウトしていたが、ConoHaのセキュリティグループへVPSを追加したことで接続できるようになった。

現在はWindows PowerShellから、作成した`deploy`ユーザーでSSH接続できる状態。

### VPSの初期設定

- `deploy`ユーザーを作成
- `deploy`ユーザーへsudo権限を付与
- Windows側でED25519のSSHキーペアを作成
- 公開鍵をVPSの`deploy`ユーザーへ登録
- `deploy@VPSのIPv4アドレス`でのSSH鍵ログインを確認
- SSHサービスがTCP 22番でIPv4/IPv6の両方を待ち受けていることを確認
- システム状態が`running`であることを確認
- UFWを有効化
- UFWでTCP 22、80、443を許可

### Docker

Docker公式の手順に従い、`docker.io`ではなくDocker公式パッケージを導入した。

- Docker Engine: `docker-ce`
- Docker CLI: `docker-ce-cli`
- containerd: `containerd.io`
- Buildx Plugin
- Compose Plugin

次のコマンドによる動作確認も完了している。

```text
docker version 29.7.2
docker compose version 5.5.0
docker run --rm hello-world
```

### DNS

Cloudflareに次のAレコードを設定した。

```text
resumefoundries.com      A  VPSのIPv4アドレス
www.resumefoundries.com  A  VPSのIPv4アドレス
```

両方ともCloudflareプロキシを有効にしているため、外部の`Resolve-DnsName`ではCloudflareのIPアドレスが返る。これはDNS未反映ではなく、正常なプロキシ動作である。

実際の通信経路は次のとおり。

```text
ブラウザ
  ↓
Cloudflare
  ↓
VPSのIPv4アドレス
```

### アプリケーション側

- プライバシーポリシーページ: `/privacy`
- お問い合わせページ: `/contact`
- GoogleフォームURLを`GOOGLE_FORM_URL`で設定
- Googleフォームの回答者向け公開を確認
- 名前、メールアドレス、問い合わせ内容、同意欄を必須化
- 電話の選択肢を削除
- SQLiteの`busy_timeout`とWALモードを環境変数で設定可能にした
- 開発用Dockerfileで再ビルド後も`curl`を利用可能にした

## 3. DNSとWebアクセスの現在状態

CloudflareのDNS設定とVPSへのAレコードは正しい。

一方、VPS上で次を実行した時点では、80番ポートで応答するWebサーバーが起動していなかった。

```bash
sudo ss -ltnp | grep -E ':80|:443'
curl -I http://127.0.0.1
```

`curl`の結果は次のとおり。

```text
curl: (7) Failed to connect to 127.0.0.1 port 80
```

したがって、現在ドメインへ接続できない原因はDNSではなく、Laravelの本番コンテナがまだVPS上で起動していないことである。

## 4. 開発環境での確認状況

ローカルの実ブラウザで次を確認済み。

- 職務経歴書フォーム表示
- ライブプレビュー反映
- 下書きの`localStorage`保存
- ページ再読み込み後の下書き復元
- AI同意前の生成ボタン無効化
- 同意後の生成ボタン有効化
- Gemini APIへの実送信とHTTP 200
- 生成された職務要約のフォーム・プレビュー反映
- AI生成中の`生成中...`表示とボタン無効化
- HTTP 503時のエラー表示とボタン復帰
- プライバシーポリシーページ表示
- お問い合わせページ表示
- Googleフォームへのリンク表示
- Googleフォームへ本番プライバシーポリシーURL（`https://resumefoundries.com/privacy`）を追記

## 5. 未完了の作業

### 本番用Docker構成

現在の[docker-compose.yml](../../docker-compose.yml)は開発用であり、本番へそのまま使用しない。

本番用に次を分離・調整する必要がある。

- `APP_ENV=production`
- `APP_DEBUG=false`
- phpMyAdminを起動しない
- Vite開発サーバーを起動しない
- Xdebugを本番イメージへ含めない
- ソースコードのbind mountを使わない
- Composer依存関係とビルド済みフロントエンド資産をイメージへ含める
- 80番・443番だけを外部公開する
- SQLiteまたはMySQLの永続化を設定する
- `.env`をVPS上だけに配置する
- Gemini APIキーをGitへ含めない

### デプロイ

- GitHubの最新コミットをVPSへ取得
- 本番用`.env`を作成
- `APP_KEY`を本番環境用に設定
- `GOOGLE_FORM_URL`へ公開GoogleフォームURLを設定
- コンテナをビルド・起動
- VPS内から80番ポートの応答を確認
- Cloudflare経由のHTTPアクセスを確認

### HTTPS

- TLS証明書を発行
- `https://resumefoundries.com` を確認
- `/privacy` と`/contact`を本番URLで確認
- CloudflareのSSL/TLSモードを`Full (strict)`へ設定
- HTTPからHTTPSへのリダイレクトを設定

### Googleフォーム

- 本番のプライバシーポリシーURLを説明文または同意項目へ追記済み。
- 公開フォームURL: `https://docs.google.com/forms/d/e/1FAIpQLScGyeWmXeSJ4vKB7g8sIwaTNhbWSGwsvPZp1yfdhJAImdbPYg/viewform?usp=header`

## 6. 次に進める順番

1. 本番用Docker ComposeとDockerfileをリポジトリへ追加
2. 変更をGitHubへプッシュ
3. VPSでリポジトリをcloneまたはpull
4. 本番用`.env`を設定
5. Dockerコンテナを起動
6. HTTPアクセスを確認
7. HTTPSを設定
8. 本番のプライバシーポリシーと問い合わせページを確認
9. Googleフォーム内の本番ポリシーURLとリンク遷移を最終確認

## 7. 注意事項

- `docker-compose.yml`は開発用のため、本番でphpMyAdminやViteを公開しない
- `APP_DEBUG=true`のまま公開しない
- `GEMINI_API_KEY`をGitへコミットしない
- `DB_BUSY_TIMEOUT`と`DB_JOURNAL_MODE=WAL`はSQLite本番環境で設定する
- Cloudflareプロキシ有効時にCloudflareのIPが返るのは正常
- VPS内で80番ポートの待受が確認できるまで、DNSの問題として扱わない
- `resumefoundries.com`のIPアドレスを直接公開する必要はなく、Cloudflareプロキシは有効のまま運用する
