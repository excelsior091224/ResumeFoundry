<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>職務経歴書プレビュー</title>
    @include('partials.gtm-head')
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>

<body>
    @include('partials.gtm-body')
    {{-- サーバーでバリデーション済みの入力内容を帳票形式で表示する。 --}}
    <main class="paper-wrap">
        <article class="paper">
            @include('resume._paper')
        </article>
    </main>
</body>

</html>
