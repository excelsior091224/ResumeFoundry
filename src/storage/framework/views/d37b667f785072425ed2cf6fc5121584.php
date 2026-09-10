<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>職務経歴書プレビュー</title>
    <?php echo $__env->make('partials.gtm-head', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
    <?php echo app('Illuminate\Foundation\Vite')(['resources/css/app.css', 'resources/js/app.js']); ?>
</head>

<body>
    <?php echo $__env->make('partials.gtm-body', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
    
    <main class="paper-wrap">
        <article class="paper">
            <?php echo $__env->make('resume._paper', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
        </article>
    </main>
</body>

</html>
<?php /**PATH /workspaces/LaravelResumeGenerationSystem/src/resources/views/resume/preview.blade.php ENDPATH**/ ?>