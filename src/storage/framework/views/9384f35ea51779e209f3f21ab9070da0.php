<div class="paper-header">
    <h2>職務経歴書</h2>
    <div class="paper-meta"><?php echo e($resume['as_of_date'] ?? ''); ?><br><b>氏名：<?php echo e($resume['full_name'] ?? ''); ?></b></div>
</div>

<div class="paper-section">
    <h3>■ 職務要約</h3>
    <p class="summary-text"><?php if(isset($resume['summary_html'])): ?><?php echo $resume['summary_html']; ?><?php else: ?><?php echo e($resume['summary'] ?? ''); ?><?php endif; ?></p>
</div>
<div class="paper-section">
    <h3>■ 得意業務</h3>
    <p>・ <?php echo e($resume['specialty'] ?? ''); ?></p>
</div>
<div class="paper-section">
    <h3>■ 技術系アカウント・ポートフォリオ</h3>
    <?php
        $links = collect($resume['links'] ?? [])->filter(fn($link) => !empty($link['url']));
    ?>
    <?php if($links->isNotEmpty()): ?>
        <ul>
            <?php $__currentLoopData = $links; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $link): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <li><span><?php echo e(($link['type'] ?? '') === 'その他' ? $link['type_custom'] ?? '' : $link['type'] ?? ''); ?>：</span><?php echo e($link['url']); ?>

                </li>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </ul>
    <?php else: ?>
        <p class="empty-note">技術系アカウントやポートフォリオを入力してください</p>
    <?php endif; ?>
</div>

<div class="paper-section">
    <h3>■ PCスキル / テクニカルスキル</h3>
    <?php
        $skillGroups = collect($resume['skills'] ?? [])
            ->filter(
                fn($skill) => ($skill['name'] ?? '') ||
                    ($skill['category'] ?? '') ||
                    ($skill['years'] ?? '') ||
                    ($skill['level'] ?? '') ||
                    ($skill['note'] ?? ''),
            )
            ->groupBy(fn($skill) => $skill['category'] ?: '未分類');
    ?>
    <table class="paper-table">
        <colgroup>
            <col class="skill-category-column">
            <col class="skill-name-column">
            <col class="skill-years-column">
            <col class="skill-level-column">
            <col class="skill-note-column">
        </colgroup>
        <thead>
            <tr>
                <th>カテゴリ</th>
                <th>スキル</th>
                <th>経験年数</th>
                <th>経験区分</th>
                <th>備考</th>
            </tr>
        </thead>
        <tbody>
            <?php $__empty_1 = true; $__currentLoopData = $skillGroups; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $category => $skills): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
                <?php $__currentLoopData = $skills; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $index => $skill): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                    <tr>
                        <td><?php echo e($category); ?></td>
                        <td><?php echo e($skill['name'] ?? ''); ?></td>
                        <td><?php echo e($skill['years'] ?? ''); ?></td>
                        <td><?php echo e($skill['level'] ?? ''); ?></td>
                        <td><?php echo e($skill['note'] ?? ''); ?></td>
                    </tr>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
                <tr>
                    <td colspan="5" class="empty-note">スキルを入力してください</td>
                </tr>
            <?php endif; ?>
        </tbody>
    </table>
</div>

<div class="paper-section">
    <h3>■ 職務経歴</h3>
    <?php
        $companies = collect($resume['companies'] ?? [])
            ->sortByDesc('period_from')
            ->values();
    ?>
    <?php $__empty_1 = true; $__currentLoopData = $companies; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $company): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
        <div class="company-block">
            <p class="company-title">勤務先：<?php echo e($company['name'] ?: (($company['employment_type'] ?? '') === 'フリーランス' ? 'フリーランス' : '所属企業名未入力')); ?>（<?php echo e($company['period_from'] ?? ''); ?>〜<?php echo e($company['period_to'] ?? ''); ?>）</p>
            <?php if(
                ($company['employment_type'] ?? '') ||
                    ($company['industry'] ?? '') ||
                    ($company['established'] ?? '') ||
                    ($company['capital'] ?? '') ||
                    ($company['employees'] ?? '')): ?>
                <p class="project-detail"><?php echo e(collect([($company['employment_type'] ?? '') === 'その他' ? $company['employment_type_custom'] ?? '' : $company['employment_type'] ?? '', $company['industry'] ?? '', $company['established'] ?? '' ? '設立：' . $company['established'] : null, $company['capital'] ?? '' ? '資本金：' . $company['capital'] : null, $company['employees'] ?? '' ? '従業員数：' . $company['employees'] : null])->filter()->join(' / ')); ?></p>
            <?php endif; ?>
            <?php if(!empty($company['business_overview'])): ?>
                <p class="project-detail"><b>【業務概要】</b><br><?php echo e($company['business_overview']); ?></p>
            <?php endif; ?>
            <?php $__currentLoopData = collect($company['projects'] ?? [])->sortByDesc('period_from')->values(); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $project): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <div class="project-block">
                    <p class="project-title">■ <?php echo e($project['name'] ?? ''); ?>（<?php echo e($project['period_from'] ?? ''); ?>〜<?php echo e($project['period_to'] ?? ''); ?>）</p>
                    <p class="project-detail"><?php echo e($project['description'] ?? ''); ?></p>
                    <p class="project-detail"><b>【担当工程】</b><br><?php echo e($project['processes'] ?? ''); ?></p>
                    <p class="project-detail"><b>【使用技術・DB・OS】</b><br><?php echo e($project['technologies'] ?? ''); ?></p>
                    <p class="project-detail"><b>【組織・役割】</b><br><?php echo e(($project['role'] ?? '') === 'その他' ? $project['role_custom'] ?? '' : $project['role'] ?? ''); ?> / <?php echo e($project['team'] ?? ''); ?></p>
                </div>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </div>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
        <p class="empty-note">所属企業とプロジェクトを入力してください</p>
    <?php endif; ?>
</div>

<div class="paper-section">
    <h3>■ 資格</h3>
    <?php if(collect($resume['certifications'] ?? [])->where('name', '!=', '')->isNotEmpty()): ?>
        <ul>
            <?php $__currentLoopData = $resume['certifications']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $certification): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <?php if(!empty($certification['name'])): ?>
                    <?php
                        $certificationDate = $certification['date'] ?? '';
                        if (preg_match('/^\d{4}-\d{2}$/', $certificationDate)) {
                            $certificationDate = str_replace('-', '年', $certificationDate) . '月';
                        }
                    ?>
                    <li><?php echo e($certificationDate); ?>　<?php echo e($certification['name']); ?></li>
                <?php endif; ?>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </ul>
    <?php else: ?>
        <p class="empty-note">資格を入力してください</p>
    <?php endif; ?>
</div>
<div class="paper-section">
    <h3>■ 自己PR</h3>
    <p><?php if(isset($resume['self_pr_html'])): ?><?php echo $resume['self_pr_html']; ?><?php else: ?><?php echo e($resume['self_pr'] ?? ''); ?><?php endif; ?></p>
</div>
<?php if(!empty($resume['considerations'])): ?>
    <div class="paper-section">
        <h3>■ 配慮事項</h3>
        <p><?php if(isset($resume['considerations_html'])): ?><?php echo $resume['considerations_html']; ?><?php else: ?><?php echo e($resume['considerations']); ?><?php endif; ?></p>
    </div>
<?php endif; ?>
<div class="paper-closing">
    <p class="paper-closing-end">以上</p>
    <p class="paper-closing-message">是非、面接の機会をいただければと思います。何卒よろしくお願いいたします。</p>
</div>
<?php /**PATH /workspaces/LaravelResumeGenerationSystem/src/resources/views/resume/_paper.blade.php ENDPATH**/ ?>