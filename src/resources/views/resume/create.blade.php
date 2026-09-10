<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>職務経歴書ジェネレーター</title>
    @include('partials.gtm-head')
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>

<body>
    @include('partials.gtm-body')
    <div class="resume-shell" x-data="resumeForm({{ Js::from($skillCategories) }}, {{ Js::from($teamRoles) }})">
        {{-- 画面のヘッダー。入力内容を保存しない方針も明示する。 --}}
        <header class="topbar">
            <div class="brand"><span class="brand-mark">R</span><span>Resume Foundry</span></div>
            <small>入力内容は保存されません</small>
        </header>

        <main class="workspace">
            <section class="form-panel">
                {{-- 左側は入力エリア。繰り返し項目はAlpine.jsで増減する。 --}}
                <div class="intro">
                    <span class="eyebrow">Career document builder</span>
                    <h1>職務経歴書をつくる</h1>
                    <p>職歴を積み上げながら、右側のプレビューで完成形を確認できます。</p>
                </div>

                <form method="POST" action="{{ route('resume.preview') }}" x-ref="resumeForm" @submit.prevent>
                    @csrf
                    @if ($errors->any())
                        <div class="validation-summary" role="alert">
                            <strong>入力内容を確認してください</strong>
                            <ul>
                                @foreach ($errors->all() as $error)
                                    <li>{{ $error }}</li>
                                @endforeach
                            </ul>
                        </div>
                    @endif
                    <section class="section-card">
                        {{-- 基本情報は職務経歴書のヘッダーへ表示する。 --}}
                        <div class="section-heading">
                            <div>
                                <h2>基本情報</h2>
                                <p>書類のヘッダーに表示する情報</p>
                            </div>
                        </div>
                        <div class="field-grid">
                            <div class="field"><label for="full_name">氏名 *</label><input id="full_name"
                                    name="full_name" x-model="resume.full_name" required></div>
                            <div class="field"><label for="as_of_date">基準日 *</label><input id="as_of_date"
                                    type="date" name="as_of_date" x-model="resume.as_of_date" required></div>
                            <div class="field full"><label>技術系アカウント・ポートフォリオ</label>
                                <div class="repeatable">
                                    <template x-for="(link, index) in resume.links" :key="link.id">
                                        <div class="field-grid link-row">
                                            <div class="field"><label>種別</label><select :name="`links[${index}][type]`"
                                                    x-model="link.type">
                                                    <option value="">選択してください</option>
                                                    <option value="GitHub">GitHub</option>
                                                    <option value="Qiita">Qiita</option>
                                                    <option value="Zenn">Zenn</option>
                                                    <option value="ポートフォリオ">ポートフォリオ</option>
                                                    <option value="その他">その他</option>
                                                </select>
                                                <input x-show="link.type === 'その他'"
                                                    :name="`links[${index}][type_custom]`" x-model="link.type_custom"
                                                    placeholder="サイト名を入力">
                                            </div>
                                            <div class="field"><label>URL</label><input type="url"
                                                    :name="`links[${index}][url]`" x-model="link.url"
                                                    placeholder="https://example.com"></div>
                                            <button type="button" class="btn btn-quiet"
                                                @click="removeItem('links', index)"
                                                x-show="resume.links.length > 1">削除</button>
                                        </div>
                                    </template>
                                </div>
                                <button type="button" class="btn btn-add" @click="addLink">＋ リンクを追加</button>
                            </div>
                        </div>
                    </section>

                    <section class="section-card">
                        <div class="section-heading">
                            <div>
                                <h2>職務要約・得意業務</h2>
                                <p>職務経歴の先頭に表示されます</p>
                            </div><button type="button" class="btn btn-secondary" @click="generateSummary"
                                :disabled="summaryLoading || !aiConsent"><span
                                    x-text="summaryLoading ? '生成中...' : '職歴からAI生成'"></span></button>
                        </div>
                        <label class="checkbox-row"><input type="checkbox"
                                x-model="aiConsent"><span>職歴、スキル、資格をAIサービスへ送信することに同意します。氏名、URL、自己PRは送信しません。</span></label>
                        <p class="validation-summary" x-show="summaryError" x-text="summaryError" role="alert"></p>
                        <div class="field"><label for="summary">職務要約</label>
                            <textarea id="summary" name="summary" x-model="resume.summary" placeholder="これまでの経験やキャリアの特徴を入力してください"></textarea>
                        </div>
                        <div class="field"><label for="specialty">得意業務</label><input id="specialty" name="specialty"
                                x-model="resume.specialty" placeholder="例：業務改善ツールの設計・開発"></div>
                    </section>

                    <section class="section-card">
                        {{-- スキルはカテゴリ、経験区分、経験年数、備考を個別に管理する。 --}}
                        <div class="section-heading">
                            <div>
                                <h2>スキル</h2>
                                <p>カテゴリ、経験区分、経験年数、備考を入力</p>
                            </div>
                        </div>
                        <div class="repeatable">
                            <template x-for="(skill, index) in resume.skills" :key="skill.id">
                                <div class="repeatable-item">
                                    <div class="item-heading"><strong x-text="`スキル ${index + 1}`"></strong><button
                                            type="button" class="btn btn-quiet" @click="removeItem('skills', index)"
                                            x-show="resume.skills.length > 1">削除</button></div>
                                    <div class="field-grid">
                                        <div class="field"><label>カテゴリ</label><select
                                                :name="`skills[${index}][category]`" x-model="skill.category"
                                                @change="selectSkillCategory(skill)">
                                                <option value="">選択してください</option><template
                                                    x-for="category in categories" :key="category.key">
                                                    <option :value="category.label" x-text="category.label"></option>
                                                </template>
                                            </select></div>
                                        <div class="field"><label>スキル名</label><input :name="`skills[${index}][name]`"
                                                x-model="skill.name" :list="`skill-options-${index}`"
                                                placeholder="例：使用した技術名"></div>
                                        <div class="field"><label>経験年数</label><input
                                                :name="`skills[${index}][years]`" x-model="skill.years"
                                                placeholder="例：2年"></div>
                                        <div class="field" x-show="skill.category !== '担当業務'">
                                            <label>経験区分</label><select :name="`skills[${index}][level]`"
                                                x-model="skill.level">
                                                <option value="">選択してください</option>
                                                <option value="業務使用">業務使用</option>
                                                <option value="個人開発">個人開発</option>
                                                <option value="自己研鑽">自己研鑽</option>
                                            </select>
                                        </div>
                                        <div class="field full"><label>備考</label><input
                                                :name="`skills[${index}][note]`" x-model="skill.note"
                                                placeholder="例：設計から実装、運用まで担当"></div>
                                    </div>
                                </div>
                            </template>
                        </div>
                        {{-- 選択中のカテゴリに一致するスキルだけを候補として表示する。 --}}
                        <template x-for="(skill, index) in resume.skills"
                            :key="`skill-options-${skill.id}-${skill.category}`">
                            <datalist :id="`skill-options-${index}`">
                                <template x-for="category in categories" :key="category.key">
                                    <template x-if="category.label === skill.category">
                                        <template x-for="name in category.skills" :key="name">
                                            <option :value="name"></option>
                                        </template>
                                    </template>
                                </template>
                            </datalist>
                        </template>
                        <button type="button" class="btn btn-add" @click="addSkill">＋ スキルを追加</button>
                    </section>

                    <section class="section-card">
                        {{-- 所属企業を親、プロジェクトを子として必要な数だけ入力できる。 --}}
                        <div class="section-heading">
                            <div>
                                <h2>職歴・プロジェクト履歴</h2>
                                <p>所属企業と、その企業で担当した案件を追加できます</p>
                            </div>
                        </div>
                        <div class="repeatable">
                            <template x-for="(company, companyIndex) in resume.companies" :key="company.id">
                                <div class="repeatable-item company-form-item">
                                    <div class="item-heading"><strong
                                            x-text="`所属企業 ${companyIndex + 1}`"></strong><button type="button"
                                            class="btn btn-quiet" @click="removeCompany(companyIndex)"
                                            x-show="resume.companies.length > 1">企業を削除</button></div>
                                    <div class="field-grid">
                                        <div class="field"><label>企業名</label><input
                                                :name="`companies[${companyIndex}][name]`" x-model="company.name"
                                                :placeholder="company.employment_type === 'フリーランス' ? '任意：屋号・氏名など' : '例：株式会社サンプル'">
                                        </div>
                                        <div class="field"><label>雇用形態・契約形態 *</label><select
                                                :name="`companies[${companyIndex}][employment_type]`"
                                                x-model="company.employment_type">
                                                <option value="">選択してください</option>
                                                <option value="正社員">正社員</option>
                                                <option value="契約社員">契約社員</option>
                                                <option value="派遣社員">派遣社員</option>
                                                <option value="パート・アルバイト">パート・アルバイト</option>
                                                <option value="業務委託">業務委託</option>
                                                <option value="フリーランス">フリーランス</option>
                                                <option value="役員">役員</option>
                                                <option value="その他">その他</option>
                                            </select>
                                            <input x-show="company.employment_type === 'その他'"
                                                :name="`companies[${companyIndex}][employment_type_custom]`"
                                                x-model="company.employment_type_custom" placeholder="契約形態を入力">
                                        </div>
                                        <div class="field"><label>在籍期間</label>
                                            <div class="field-grid">
                                                <div class="field"><label class="sub-label">開始年月</label><input
                                                        type="month"
                                                        :name="`companies[${companyIndex}][period_from]`"
                                                        x-model="company.period_from"></div>
                                                <div class="field"><label class="sub-label">終了年月</label><input
                                                        type="month" :name="`companies[${companyIndex}][period_to]`"
                                                        x-model="company.period_to" :disabled="company.is_current"
                                                        @change="if (company.is_current) company.period_to = ''"></div>
                                            </div>
                                            <label class="checkbox-row"><input type="checkbox"
                                                    :name="`companies[${companyIndex}][is_current]`"
                                                    x-model="company.is_current" :value="true"
                                                    @change="if (company.is_current) company.period_to = ''"><span>現在も在籍中</span></label>
                                        </div>
                                        <div class="field"><label>事業内容</label><input
                                                :name="`companies[${companyIndex}][industry]`"
                                                x-model="company.industry" placeholder="例：ITサービス"></div>
                                        <div class="field full"><label>業務概要</label>
                                            <textarea :name="`companies[${companyIndex}][business_overview]`" x-model="company.business_overview"
                                                placeholder="プロジェクトに分けない、所属中の担当業務や役割の概要を入力してください"></textarea>
                                        </div>
                                        <div class="field"><label>従業員数</label><input
                                                :name="`companies[${companyIndex}][employees]`"
                                                x-model="company.employees" placeholder="例：100名"></div>
                                        <div class="field"><label>設立</label><input
                                                :name="`companies[${companyIndex}][established]`"
                                                x-model="company.established" placeholder="例：2010年"></div>
                                        <div class="field"><label>資本金</label><input
                                                :name="`companies[${companyIndex}][capital]`"
                                                x-model="company.capital" placeholder="例：1,000万円"></div>
                                    </div>
                                    <div class="nested-heading"><strong>プロジェクト履歴</strong><button type="button"
                                            class="btn btn-secondary" @click="addProject(companyIndex)">＋
                                            案件を追加</button></div>
                                    <div class="repeatable">
                                        <template x-for="(project, projectIndex) in company.projects"
                                            :key="project.id">
                                            <div class="nested-item">
                                                <div class="item-heading"><strong
                                                        x-text="`プロジェクト ${projectIndex + 1}`"></strong><button
                                                        type="button" class="btn btn-quiet"
                                                        @click="removeProject(companyIndex, projectIndex)"
                                                        x-show="company.projects.length > 1">削除</button></div>
                                                <div class="field-grid">
                                                    <div class="field"><label>期間</label>
                                                        <div class="field-grid">
                                                            <div class="field"><label
                                                                    class="sub-label">開始年月</label><input
                                                                    type="month"
                                                                    :name="`companies[${companyIndex}][projects][${projectIndex}][period_from]`"
                                                                    x-model="project.period_from"></div>
                                                            <div class="field"><label
                                                                    class="sub-label">終了年月</label><input
                                                                    type="month"
                                                                    :name="`companies[${companyIndex}][projects][${projectIndex}][period_to]`"
                                                                    x-model="project.period_to"
                                                                    :disabled="project.is_current"
                                                                    @change="if (project.is_current) project.period_to = ''">
                                                            </div>
                                                        </div>
                                                        <label class="checkbox-row"><input type="checkbox"
                                                                :name="`companies[${companyIndex}][projects][${projectIndex}][is_current]`"
                                                                x-model="project.is_current" :value="true"
                                                                @change="if (project.is_current) project.period_to = ''"><span>プロジェクト継続中</span></label>
                                                    </div>
                                                    <div class="field"><label>組織・役割</label><select
                                                            :name="`companies[${companyIndex}][projects][${projectIndex}][role]`"
                                                            x-model="project.role">
                                                            <option value="">選択してください</option>
                                                            <template x-for="group in roleGroups"
                                                                :key="group.category">
                                                                <optgroup :label="group.category">
                                                                    <template x-for="role in group.roles"
                                                                        :key="role.value">
                                                                        <option :value="role.value"
                                                                            x-text="role.value"></option>
                                                                    </template>
                                                                </optgroup>
                                                            </template>
                                                            <option value="その他">その他</option>
                                                        </select>
                                                        <input x-show="project.role === 'その他'"
                                                            :name="`companies[${companyIndex}][projects][${projectIndex}][role_custom]`"
                                                            x-model="project.role_custom" placeholder="具体的な役割を入力">
                                                    </div>
                                                    <div class="field full"><label>プロジェクト名</label><input
                                                            :name="`companies[${companyIndex}][projects][${projectIndex}][name]`"
                                                            x-model="project.name" placeholder="例：社内業務支援システム"></div>
                                                    <div class="field full"><label>業務内容</label>
                                                        <textarea :name="`companies[${companyIndex}][projects][${projectIndex}][description]`" x-model="project.description"
                                                            placeholder="目的、担当内容、工夫した点や成果を入力してください"></textarea>
                                                    </div>
                                                    <div class="field"><label>担当工程</label><input
                                                            :name="`companies[${companyIndex}][projects][${projectIndex}][processes]`"
                                                            x-model="project.processes"
                                                            placeholder="例：要件整理、設計、実装、テスト"></div>
                                                    <div class="field"><label>チーム構成</label><input
                                                            :name="`companies[${companyIndex}][projects][${projectIndex}][team]`"
                                                            x-model="project.team" placeholder="例：開発3名、利用部門2名"></div>
                                                    <div class="field full"><label>使用技術・DB・OS</label><input
                                                            :name="`companies[${companyIndex}][projects][${projectIndex}][technologies]`"
                                                            x-model="project.technologies"
                                                            placeholder="例：言語、フレームワーク、DB、開発環境"></div>
                                                </div>
                                            </div>
                                        </template>
                                    </div>
                                </div>
                            </template>
                        </div>
                        <button type="button" class="btn btn-add" @click="addCompany">＋ 所属企業を追加</button>
                    </section>

                    <section class="section-card">
                        {{-- 資格は取得年月と資格名の組を複数登録できる。 --}}
                        <div class="section-heading">
                            <div>
                                <h2>資格</h2>
                                <p>取得年月と資格名を登録</p>
                            </div>
                        </div>
                        <div class="repeatable">
                            <template x-for="(certification, index) in resume.certifications" :key="certification.id">
                                <div class="repeatable-item">
                                    <div class="item-heading"><strong x-text="`資格 ${index + 1}`"></strong><button
                                            type="button" class="btn btn-quiet"
                                            @click="removeItem('certifications', index)"
                                            x-show="resume.certifications.length > 1">削除</button></div>
                                    <div class="field-grid">
                                        <div class="field"><label>取得年月</label><input type="month"
                                                :name="`certifications[${index}][date]`" x-model="certification.date">
                                        </div>
                                        <div class="field"><label>資格名</label><input
                                                :name="`certifications[${index}][name]`" x-model="certification.name"
                                                placeholder="例：取得した資格名"></div>
                                    </div>
                                </div>
                            </template>
                        </div>
                        <button type="button" class="btn btn-add" @click="addCertification">＋ 資格を追加</button>
                    </section>

                    {{-- 自己PRは自由記述として職務経歴書の末尾へ表示する。 --}}
                    <section class="section-card">
                        <div class="section-heading">
                            <div>
                                <h2>自己PR</h2>
                                <p>強み、学習姿勢、成果など</p>
                            </div>
                        </div>
                        <div class="field">
                            <textarea name="self_pr" x-model="resume.self_pr" placeholder="自己PRを入力してください"></textarea>
                        </div>
                    </section>
                    <section class="section-card">
                        <div class="section-heading">
                            <div>
                                <h2>配慮事項</h2>
                                <p>就業上の配慮が必要な事項を、共有する範囲で記載</p>
                            </div>
                        </div>
                        <div class="field">
                            <textarea name="considerations" x-model="resume.considerations" placeholder="例：通院、勤務時間、作業環境などに関する配慮事項"></textarea>
                        </div>
                    </section>
                    <p class="draft-note">入力内容はこのブラウザに下書きとして自動保存されます。共有端末では作業後に下書きをクリアしてください。</p>
                    <div class="form-actions"><button type="button" class="btn btn-secondary"
                            @click="window.print()">プレビューを印刷</button><button type="button" class="btn btn-secondary"
                            @click="download('{{ route('resume.download.pdf') }}')">PDFをダウンロード</button><button
                            type="button" class="btn btn-secondary"
                            @click="download('{{ route('resume.download.docx') }}')">DOCXをダウンロード</button><button
                            type="button" class="btn btn-quiet" @click="clearDraft">下書きをクリア</button></div>
                </form>
            </section>

            {{-- 右側は入力状態を即時反映するライブプレビュー。 --}}
            <section class="preview-panel">
                <div class="preview-label"><span>Live preview</span><span
                        x-text="`${resume.companies.length} companies · ${resume.companies.reduce((total, company) => total + company.projects.length, 0)} projects · ${resume.skills.length} skills`"></span>
                </div>
                <div class="paper-wrap">
                    <div class="paper" x-html="renderPreview()"></div>
                </div>
            </section>
        </main>

        <footer class="site-footer">
            <div class="footer-nav">
                <a href="{{ route('resume.create') }}">ホーム (作成)</a>
                <a href="{{ route('privacy') }}">プライバシーポリシー</a>
                <a href="{{ route('contact') }}">お問い合わせ</a>
            </div>
            <p class="copyright">&copy; {{ date('Y') }} Resume Foundry - 登録不要の即時職務経歴書生成システム</p>
        </footer>
    </div>
</body>

</html>
