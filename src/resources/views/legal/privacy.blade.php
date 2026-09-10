<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>プライバシーポリシー | 職務経歴書ジェネレーター</title>
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
                <a href="{{ route('contact') }}">お問い合わせ</a>
            </nav>
        </header>

        <main class="info-main">
            <div class="info-kicker">Privacy</div>
            <h1>プライバシーポリシー</h1>
            <p class="info-lead">Resume Foundry（以下「本サービス」）は、職務経歴書の作成を支援するサービスです。本ページでは、本サービスにおける情報の取り扱いを説明します。</p>

            <section class="info-section">
                <h2>1. 取得する情報</h2>
                <p>本サービスでは、次の情報を取得または取り扱います。</p>
                <ul>
                    <li>職務経歴書の作成時に利用者が入力する氏名、基準日、職歴、プロジェクト、スキル、資格、自己PR、配慮事項、技術系アカウントのURLなどの情報</li>
                    <li>お問い合わせフォームの利用時に利用者が入力する氏名、メールアドレス、件名、お問い合わせ内容などの情報</li>
                </ul>
                <p>お問い合わせフォームで取得する氏名とメールアドレスは、お問い合わせへの回答、本人確認、必要な連絡を行うために利用します。お問い合わせフォームの回答はGoogleフォーム上で送信・管理されます。</p>
            </section>

            <section class="info-section">
                <h2>2. 入力内容の保存</h2>
                <p>フォーム入力内容は、本サービスのデータベース、永続セッション、キャッシュ、キューへ保存しません。入力中の下書きは、利便性のため利用者のブラウザ内のlocalStorageへ保存されます。共有端末を利用した場合は、作業終了後に画面の「下書きをクリア」を実行してください。
                </p>
                <p>PDF・DOCXの生成時は、入力内容を処理してファイルを返します。生成ファイルは利用者自身で管理してください。</p>
                <p>お問い合わせフォームから送信された情報は、回答や連絡に必要な範囲で確認します。GoogleフォームおよびGoogleの関連サービスにおける情報の取り扱いについては、Googleのプライバシーポリシー等もご確認ください。
                </p>
            </section>

            <section class="info-section">
                <h2>3. AI機能の利用</h2>
                <p>利用者が同意した場合に限り、職務要約の生成に必要な職歴、プロジェクト、スキル、資格をAIサービスへ送信します。氏名、URL、自己PR、配慮事項はAIサービスへ送信しません。</p>
                <p>AIが生成した文章には誤りが含まれる場合があります。内容を確認し、必要に応じて利用者自身で修正してください。</p>
            </section>

            <section class="info-section">
                <h2>4. アクセス解析</h2>
                <p>本サービスでは、利用状況の把握と改善のためにGoogle Tag Managerを利用しています。設定されたアクセス解析サービスにより、Cookie、閲覧したページ、利用環境などの情報が収集される場合があります。</p>
            </section>

            <section class="info-section">
                <h2>5. 安全管理</h2>
                <p>本サービスは、入力内容を必要以上に保持しない設計とし、不正アクセス、滅失、毀損、漏えいなどの防止に努めます。ただし、インターネット通信や利用者の端末における完全な安全性を保証するものではありません。
                </p>
            </section>

            <section class="info-section">
                <h2>6. 本ポリシーの変更</h2>
                <p>サービス内容や法令の変更に応じて、本ポリシーを改定することがあります。重要な変更がある場合は、本ページ上でお知らせします。</p>
            </section>

            <section class="info-section">
                <h2>7. お問い合わせ</h2>
                <p>本ポリシーに関するお問い合わせは、<a href="{{ route('contact') }}">お問い合わせページ</a>からお送りください。</p>
            </section>

            <section class="info-section">
                <h2>8. 運営者情報</h2>
                <p>運営者：ギムレット</p>
                <p>運営者情報の詳細は、<a href="https://lit.link/gimlet202307" target="_blank"
                        rel="noopener noreferrer">ギムレットのプロフィールページ</a>をご確認ください。</p>
            </section>

            <p class="info-updated">制定日：2026年8月22日　最終改定日：2026年9月10日</p>
        </main>
    </div>
</body>

</html>
