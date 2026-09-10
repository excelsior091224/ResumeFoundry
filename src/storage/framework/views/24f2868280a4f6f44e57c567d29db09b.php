<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <style>
        @font-face {
            font-family: 'IPAexGothic';
            font-style: normal;
            font-weight: 400;
            src: url('file://<?php echo e(resource_path('fonts/IPAexGothic.ttf')); ?>') format('truetype');
        }

        @font-face {
            font-family: 'IPAexGothic';
            font-style: normal;
            font-weight: 700;
            src: url('file://<?php echo e(resource_path('fonts/IPAexGothic.ttf')); ?>') format('truetype');
        }

        @page {
            margin: 14mm 12mm;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            color: #20252a;
            font-family: 'IPAexGothic', sans-serif;
            font-size: 9.5pt;
            line-height: 1.55;
        }

        .paper {
            width: 100%;
            padding: 0;
            background: #fffefb;
        }

        .paper-header {
            display: flex;
            align-items: end;
            justify-content: space-between;
            border-bottom: 2pt solid #20252a;
            padding-bottom: 8pt;
        }

        .paper-header h2 {
            margin: 0;
            font-size: 19pt;
            letter-spacing: 0.16em;
        }

        .paper-meta {
            text-align: right;
            font-size: 9.5pt;
            line-height: 1.5;
        }

        .paper-section {
            margin-top: 12pt;
        }

        .paper-section h3 {
            margin: 0 0 5pt;
            padding-bottom: 2pt;
            border-bottom: 1.3pt solid #20252a;
            font-size: 10.5pt;
        }

        .paper-section p {
            margin: 0;
            white-space: pre-wrap;
            word-break: normal;
            overflow-wrap: break-word;
            line-break: strict;
        }

        .paper-closing {
            margin-top: 14pt;
        }

        .paper-closing p {
            margin: 0;
        }

        .paper-closing-end {
            text-align: right;
        }

        .paper-closing-message {
            text-align: center;
        }

        .paper-section .summary-text {
            font-size: 9pt;
            line-height: 1.65;
            letter-spacing: 0;
            word-spacing: 0;
            white-space: pre-wrap;
        }

        .paper-section ul {
            margin: 0;
            padding-left: 15pt;
        }

        .paper-section li {
            margin: 1pt 0;
            overflow-wrap: anywhere;
            line-break: strict;
        }

        .paper-table {
            width: 100%;
            table-layout: fixed;
            border-collapse: collapse;
            font-size: 8pt;
        }

        .skill-category-column {
            width: 17%;
        }

        .skill-name-column {
            width: 18%;
        }

        .skill-years-column {
            width: 10%;
        }

        .skill-level-column {
            width: 15%;
        }

        .skill-note-column {
            width: 40%;
        }

        .paper-table th,
        .paper-table td {
            border: 0.5pt solid #20252a;
            padding: 3pt 4pt;
            vertical-align: top;
            word-break: normal;
            overflow-wrap: break-word;
            line-break: strict;
        }

        .paper-table th {
            background: #e9e9e7;
            text-align: left;
            font-weight: 700;
        }

        .company-block {
            margin-bottom: 8pt;
        }

        .company-title {
            margin: 0;
            padding-bottom: 2pt;
            border-bottom: 0.7pt solid #20252a;
            font-size: 9.5pt;
            font-weight: 700;
        }

        .project-block {
            padding: 5pt 0 6pt 5pt;
            border-bottom: 0.5pt solid #aeb4b2;
        }

        .project-title {
            margin: 0 0 2pt;
            font-size: 9.5pt;
            font-weight: 700;
        }

        .project-detail {
            margin: 1pt 0;
            font-size: 8pt;
            line-height: 1.45;
            white-space: pre-wrap;
            word-break: normal;
            overflow-wrap: break-word;
            line-break: strict;
        }

        .empty-note {
            color: #8b9494;
            font-style: italic;
        }
    </style>
</head>

<body>
    <article class="paper">
        <?php echo $__env->make('resume._paper', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>
    </article>
</body>

</html>
<?php /**PATH /workspaces/LaravelResumeGenerationSystem/src/resources/views/resume/document.blade.php ENDPATH**/ ?>