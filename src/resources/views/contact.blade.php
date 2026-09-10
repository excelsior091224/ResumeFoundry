<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>お問い合わせ | 職務経歴書ジェネレーター</title>
    @include('partials.gtm-head')
    @vite(['resources/css/app.css'])
</head>

<body>
    @include('partials.gtm-body')
    <div class="info-shell">
        <header class="topbar">
            <a class="brand brand-link" href="{{ route('resume.create') }}"><span class="brand-mark">R</span><span>Resume
                    Foundry</span></a>
            <nav class="site-nav" aria-label="サイトメニュー">
                <a href="{{ route('resume.create') }}">作成画面</a>
                <a href="{{ route('privacy') }}">プライバシーポリシー</a>
            </nav>
        </header>

        <main class="info-main info-main-narrow">
            <div class="info-kicker">Contact</div>
            <h1>お問い合わせ</h1>
            <p class="info-lead">本サービスに関するご質問、不具合の報告、掲載内容に関するご連絡は、以下のフォームからお送りください。</p>

            @if ($googleFormUrl)
                <a class="info-cta" href="{{ $googleFormUrl }}" target="_blank"
                    rel="noopener noreferrer">Googleフォームを開く<span aria-hidden="true">↗</span></a>
                <p class="info-note">Googleフォームが新しいタブで開きます。回答内容はGoogleのサービス上で取り扱われます。</p>
            @else
                <div class="info-notice" role="status">お問い合わせフォームは準備中です。</div>
                <p class="info-note">運営者がGoogleフォームを作成後、環境変数 <code>GOOGLE_FORM_URL</code> にフォームの公開URLを設定してください。</p>
            @endif

            <p class="info-back"><a href="{{ route('resume.create') }}">← 職務経歴書の作成画面へ戻る</a></p>
        </main>
    </div>
</body>

</html>
