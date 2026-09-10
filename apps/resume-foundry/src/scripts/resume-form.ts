import {
  buildSummaryCareerData,
  coerceResumeDraft,
  normalizeResumeData,
} from '../features/resume/validation';
import {
  createBlankCertification,
  createBlankCompany,
  createBlankLink,
  createBlankProject,
  createBlankResume,
  createBlankSkill,
  EMPLOYMENT_TYPES,
  LINK_TYPES,
  SKILL_LEVELS,
  toDateInputValue,
} from '../features/resume/defaults';
import { renderResumePreviewHtml } from '../features/resume/render';
import type { ResumePayload, SkillCategoryMap, TeamRoleGroup } from '../features/resume/types';

interface BootstrapPayload {
  initialResume: ResumePayload;
  skillCategories: SkillCategoryMap;
  teamRoles: TeamRoleGroup[];
  endpoints: {
    summary: string;
    preview: string;
    downloadPdf: string;
    downloadDocx: string;
  };
}

interface AppState {
  resume: ResumePayload;
  aiConsent: boolean;
  summaryLoading: boolean;
  summaryError: string;
  validationMessages: string[];
}

const draftStorageKey = 'resume-foundry-draft-v2';

function escapeHtml(value: string | undefined | null): string {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character] ?? character,
  );
}

function getBootstrap(): BootstrapPayload | null {
  const element = document.getElementById('resume-bootstrap');
  if (!element?.textContent) {
    return null;
  }

  return JSON.parse(element.textContent) as BootstrapPayload;
}

function categoryEntries(skillCategories: SkillCategoryMap) {
  return Object.entries(skillCategories).map(([key, category]) => ({ key, ...category }));
}

function renderValidation(messages: string[]): string {
  if (!messages.length) {
    return '';
  }

  return `<div class="validation-summary" role="alert"><strong>入力内容を確認してください</strong><ul>${messages
    .map((message) => `<li>${escapeHtml(message)}</li>`)
    .join('')}</ul></div>`;
}

function renderLinks(resume: ResumePayload): string {
  return resume.links
    .map(
      (link, index) => `
      <div class="field-grid link-row repeatable-item">
        <div class="field">
          <label>種別</label>
          <select name="links[${index}][type]" data-rerender="true">
            <option value="">選択してください</option>
            ${LINK_TYPES.map(
              (type) => `<option value="${type}" ${link.type === type ? 'selected' : ''}>${type}</option>`,
            ).join('')}
          </select>
          ${
            link.type === 'その他'
              ? `<input name="links[${index}][type_custom]" value="${escapeHtml(link.type_custom)}" placeholder="サイト名を入力">`
              : ''
          }
        </div>
        <div class="field"><label>URL</label><input type="url" name="links[${index}][url]" value="${escapeHtml(link.url)}" placeholder="https://example.com"></div>
        <button type="button" class="btn btn-quiet" data-action="remove-link" data-index="${index}" ${resume.links.length === 1 ? 'disabled' : ''}>削除</button>
      </div>`,
    )
    .join('');
}

function renderSkills(resume: ResumePayload, categories: ReturnType<typeof categoryEntries>): string {
  return resume.skills
    .map((skill, index) => {
      const selectedCategory = categories.find((category) => category.label === skill.category);
      return `
        <div class="repeatable-item">
          <div class="item-heading"><strong>スキル ${index + 1}</strong><button type="button" class="btn btn-quiet" data-action="remove-skill" data-index="${index}" ${resume.skills.length === 1 ? 'disabled' : ''}>削除</button></div>
          <div class="field-grid">
            <div class="field"><label>カテゴリ</label><select name="skills[${index}][category]" data-rerender="true">
              <option value="">選択してください</option>
              ${categories
                .map(
                  (category) =>
                    `<option value="${escapeHtml(category.label)}" ${skill.category === category.label ? 'selected' : ''}>${escapeHtml(category.label)}</option>`,
                )
                .join('')}
            </select></div>
            <div class="field"><label>スキル名</label><input name="skills[${index}][name]" value="${escapeHtml(skill.name)}" list="skill-options-${index}" placeholder="例：使用した技術名"></div>
            <div class="field"><label>経験年数</label><input name="skills[${index}][years]" value="${escapeHtml(skill.years)}" placeholder="例：2年"></div>
            ${
              skill.category !== '担当業務'
                ? `<div class="field"><label>経験区分</label><select name="skills[${index}][level]"><option value="">選択してください</option>${SKILL_LEVELS.map(
                    (level) => `<option value="${level}" ${skill.level === level ? 'selected' : ''}>${level}</option>`,
                  ).join('')}</select></div>`
                : ''
            }
            <div class="field full"><label>備考</label><input name="skills[${index}][note]" value="${escapeHtml(skill.note)}" placeholder="例：設計から実装、運用まで担当"></div>
          </div>
          <datalist id="skill-options-${index}">${(selectedCategory?.skills ?? [])
            .map((name) => `<option value="${escapeHtml(name)}"></option>`)
            .join('')}</datalist>
        </div>`;
    })
    .join('');
}

function renderProjects(companyIndex: number, company: ResumePayload['companies'][number], roleGroups: TeamRoleGroup[]): string {
  return company.projects
    .map(
      (project, projectIndex) => `
      <div class="nested-item">
        <div class="item-heading"><strong>プロジェクト ${projectIndex + 1}</strong><button type="button" class="btn btn-quiet" data-action="remove-project" data-company-index="${companyIndex}" data-project-index="${projectIndex}" ${company.projects.length === 1 ? 'disabled' : ''}>削除</button></div>
        <div class="field-grid">
          <div class="field"><label>期間</label>
            <div class="field-grid">
              <div class="field"><label class="sub-label">開始年月</label><input type="month" name="companies[${companyIndex}][projects][${projectIndex}][period_from]" value="${escapeHtml(project.period_from)}"></div>
              <div class="field"><label class="sub-label">終了年月</label><input type="month" name="companies[${companyIndex}][projects][${projectIndex}][period_to]" value="${escapeHtml(project.period_to)}" ${project.is_current ? 'disabled' : ''}></div>
            </div>
            <label class="checkbox-row"><input type="checkbox" name="companies[${companyIndex}][projects][${projectIndex}][is_current]" value="true" ${project.is_current ? 'checked' : ''} data-rerender="true"><span>プロジェクト継続中</span></label>
          </div>
          <div class="field"><label>組織・役割</label><select name="companies[${companyIndex}][projects][${projectIndex}][role]" data-rerender="true">
            <option value="">選択してください</option>
            ${roleGroups
              .map(
                (group) => `<optgroup label="${escapeHtml(group.category)}">${group.roles
                  .map(
                    (role) =>
                      `<option value="${escapeHtml(role.value)}" ${project.role === role.value ? 'selected' : ''}>${escapeHtml(role.value)}</option>`,
                  )
                  .join('')}</optgroup>`,
              )
              .join('')}
            <option value="その他" ${project.role === 'その他' ? 'selected' : ''}>その他</option>
          </select>
          ${
            project.role === 'その他'
              ? `<input name="companies[${companyIndex}][projects][${projectIndex}][role_custom]" value="${escapeHtml(project.role_custom)}" placeholder="具体的な役割を入力">`
              : ''
          }</div>
          <div class="field full"><label>プロジェクト名</label><input required name="companies[${companyIndex}][projects][${projectIndex}][name]" value="${escapeHtml(project.name)}" placeholder="例：社内業務支援システム"></div>
          <div class="field full"><label>業務内容</label><textarea name="companies[${companyIndex}][projects][${projectIndex}][description]" placeholder="目的、担当内容、工夫した点や成果を入力してください">${escapeHtml(project.description)}</textarea></div>
          <div class="field"><label>担当工程</label><input name="companies[${companyIndex}][projects][${projectIndex}][processes]" value="${escapeHtml(project.processes)}" placeholder="例：要件整理、設計、実装、テスト"></div>
          <div class="field"><label>チーム構成</label><input name="companies[${companyIndex}][projects][${projectIndex}][team]" value="${escapeHtml(project.team)}" placeholder="例：開発3名、利用部門2名"></div>
          <div class="field full"><label>使用技術・DB・OS</label><input name="companies[${companyIndex}][projects][${projectIndex}][technologies]" value="${escapeHtml(project.technologies)}" placeholder="例：言語、フレームワーク、DB、開発環境"></div>
        </div>
      </div>`,
    )
    .join('');
}

function renderCompanies(resume: ResumePayload, roleGroups: TeamRoleGroup[]): string {
  return resume.companies
    .map(
      (company, companyIndex) => `
      <div class="repeatable-item company-form-item">
        <div class="item-heading"><strong>所属企業 ${companyIndex + 1}</strong><button type="button" class="btn btn-quiet" data-action="remove-company" data-index="${companyIndex}" ${resume.companies.length === 1 ? 'disabled' : ''}>企業を削除</button></div>
        <div class="field-grid">
          <div class="field"><label>企業名</label><input name="companies[${companyIndex}][name]" value="${escapeHtml(company.name)}" placeholder="${company.employment_type === 'フリーランス' ? '任意：屋号・氏名など' : '例：株式会社サンプル'}"></div>
          <div class="field"><label>雇用形態・契約形態 *</label><select required name="companies[${companyIndex}][employment_type]" data-rerender="true">
            <option value="">選択してください</option>
            ${EMPLOYMENT_TYPES.map(
              (type) => `<option value="${type}" ${company.employment_type === type ? 'selected' : ''}>${type}</option>`,
            ).join('')}
          </select>
          ${
            company.employment_type === 'その他'
              ? `<input name="companies[${companyIndex}][employment_type_custom]" value="${escapeHtml(company.employment_type_custom)}" placeholder="契約形態を入力">`
              : ''
          }</div>
          <div class="field"><label>在籍期間</label>
            <div class="field-grid">
              <div class="field"><label class="sub-label">開始年月</label><input type="month" name="companies[${companyIndex}][period_from]" value="${escapeHtml(company.period_from)}"></div>
              <div class="field"><label class="sub-label">終了年月</label><input type="month" name="companies[${companyIndex}][period_to]" value="${escapeHtml(company.period_to)}" ${company.is_current ? 'disabled' : ''}></div>
            </div>
            <label class="checkbox-row"><input type="checkbox" name="companies[${companyIndex}][is_current]" value="true" ${company.is_current ? 'checked' : ''} data-rerender="true"><span>現在も在籍中</span></label>
          </div>
          <div class="field"><label>事業内容</label><input name="companies[${companyIndex}][industry]" value="${escapeHtml(company.industry)}" placeholder="例：ITサービス"></div>
          <div class="field full"><label>業務概要</label><textarea name="companies[${companyIndex}][business_overview]" placeholder="プロジェクトに分けない、所属中の担当業務や役割の概要を入力してください">${escapeHtml(company.business_overview)}</textarea></div>
          <div class="field"><label>従業員数</label><input name="companies[${companyIndex}][employees]" value="${escapeHtml(company.employees)}" placeholder="例：100名"></div>
          <div class="field"><label>設立</label><input name="companies[${companyIndex}][established]" value="${escapeHtml(company.established)}" placeholder="例：2010年"></div>
          <div class="field"><label>資本金</label><input name="companies[${companyIndex}][capital]" value="${escapeHtml(company.capital)}" placeholder="例：1,000万円"></div>
        </div>
        <div class="nested-heading"><strong>プロジェクト履歴</strong><button type="button" class="btn btn-secondary" data-action="add-project" data-company-index="${companyIndex}">＋ 案件を追加</button></div>
        <div class="repeatable">${renderProjects(companyIndex, company, roleGroups)}</div>
      </div>`,
    )
    .join('');
}

function renderCertifications(resume: ResumePayload): string {
  return resume.certifications
    .map(
      (certification, index) => `
      <div class="repeatable-item">
        <div class="item-heading"><strong>資格 ${index + 1}</strong><button type="button" class="btn btn-quiet" data-action="remove-certification" data-index="${index}" ${resume.certifications.length === 1 ? 'disabled' : ''}>削除</button></div>
        <div class="field-grid">
          <div class="field"><label>取得年月</label><input type="month" name="certifications[${index}][date]" value="${escapeHtml(certification.date)}"></div>
          <div class="field"><label>資格名</label><input name="certifications[${index}][name]" value="${escapeHtml(certification.name)}" placeholder="例：取得した資格名"></div>
        </div>
      </div>`,
    )
    .join('');
}

function renderFormHtml(state: AppState, bootstrap: BootstrapPayload): string {
  const categories = categoryEntries(bootstrap.skillCategories);

  return `
    <form id="resume-form">
      ${renderValidation(state.validationMessages)}
      <section class="section-card">
        <div class="section-heading"><div><h2>基本情報</h2><p>書類のヘッダーに表示する情報</p></div></div>
        <div class="field-grid">
          <div class="field"><label for="full_name">氏名 *</label><input id="full_name" name="full_name" value="${escapeHtml(state.resume.full_name)}" required maxlength="100"></div>
          <div class="field"><label for="as_of_date">基準日 *</label><input id="as_of_date" type="date" name="as_of_date" value="${escapeHtml(state.resume.as_of_date)}" required></div>
          <div class="field full"><label>技術系アカウント・ポートフォリオ</label><div class="repeatable">${renderLinks(state.resume)}</div><button type="button" class="btn btn-add" data-action="add-link">＋ リンクを追加</button></div>
        </div>
      </section>

      <section class="section-card">
        <div class="section-heading"><div><h2>職務要約・得意業務</h2><p>職務経歴の先頭に表示されます</p></div><button type="button" class="btn btn-secondary" data-action="generate-summary" ${state.summaryLoading || !state.aiConsent ? 'disabled' : ''}>${state.summaryLoading ? '生成中...' : '職歴からAI生成'}</button></div>
        <label class="checkbox-row"><input type="checkbox" id="ai_consent" ${state.aiConsent ? 'checked' : ''}><span>職歴、スキル、資格をAIサービスへ送信することに同意します。氏名、URL、自己PRは送信しません。</span></label>
        ${state.summaryError ? `<p class="validation-summary" role="alert">${escapeHtml(state.summaryError)}</p>` : ''}
        <div class="field"><label for="summary">職務要約</label><textarea id="summary" name="summary" maxlength="3000" placeholder="これまでの経験やキャリアの特徴を入力してください">${escapeHtml(state.resume.summary)}</textarea></div>
        <div class="field"><label for="specialty">得意業務</label><input id="specialty" name="specialty" value="${escapeHtml(state.resume.specialty)}" maxlength="500" placeholder="例：業務改善ツールの設計・開発"></div>
      </section>

      <section class="section-card">
        <div class="section-heading"><div><h2>スキル</h2><p>カテゴリ、経験区分、経験年数、備考を入力</p></div></div>
        <div class="repeatable">${renderSkills(state.resume, categories)}</div>
        <button type="button" class="btn btn-add" data-action="add-skill">＋ スキルを追加</button>
      </section>

      <section class="section-card">
        <div class="section-heading"><div><h2>職歴・プロジェクト履歴</h2><p>所属企業と、その企業で担当した案件を追加できます</p></div></div>
        <div class="repeatable">${renderCompanies(state.resume, bootstrap.teamRoles)}</div>
        <button type="button" class="btn btn-add" data-action="add-company">＋ 所属企業を追加</button>
      </section>

      <section class="section-card">
        <div class="section-heading"><div><h2>資格</h2><p>取得年月と資格名を登録</p></div></div>
        <div class="repeatable">${renderCertifications(state.resume)}</div>
        <button type="button" class="btn btn-add" data-action="add-certification">＋ 資格を追加</button>
      </section>

      <section class="section-card">
        <div class="section-heading"><div><h2>自己PR</h2><p>強み、学習姿勢、成果など</p></div></div>
        <div class="field"><textarea name="self_pr" maxlength="5000" placeholder="自己PRを入力してください">${escapeHtml(state.resume.self_pr)}</textarea></div>
      </section>

      <section class="section-card">
        <div class="section-heading"><div><h2>配慮事項</h2><p>就業上の配慮が必要な事項を、共有する範囲で記載</p></div></div>
        <div class="field"><textarea name="considerations" maxlength="5000" placeholder="例：通院、勤務時間、作業環境などに関する配慮事項">${escapeHtml(state.resume.considerations)}</textarea></div>
      </section>

      <p class="draft-note">入力内容はこのブラウザに下書きとして自動保存されます。共有端末では作業後に下書きをクリアしてください。</p>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" data-action="print-preview">プレビューを印刷</button>
        <button type="button" class="btn btn-secondary" data-action="download-pdf">PDFをダウンロード</button>
        <button type="button" class="btn btn-secondary" data-action="download-docx">DOCXをダウンロード</button>
        <button type="button" class="btn btn-quiet" data-action="clear-draft">下書きをクリア</button>
      </div>
    </form>`;
}

function assignNestedValue(target: Record<string, unknown>, path: string[], value: string): void {
  let current: Record<string, unknown> | unknown[] = target;

  path.forEach((segment, index) => {
    const isLast = index === path.length - 1;
    const nextSegment = path[index + 1];
    const nextIsArray = nextSegment !== undefined && /^\d+$/.test(nextSegment);

    if (Array.isArray(current)) {
      const arrayIndex = Number(segment);
      if (Number.isNaN(arrayIndex)) {
        return;
      }
      if (isLast) {
        current[arrayIndex] = value;
        return;
      }
      current[arrayIndex] ??= nextIsArray ? [] : {};
      current = current[arrayIndex] as Record<string, unknown> | unknown[];
      return;
    }

    if (isLast) {
      current[segment] = value;
      return;
    }

    current[segment] ??= nextIsArray ? [] : {};
    current = current[segment] as Record<string, unknown> | unknown[];
  });
}

function formDataToObject(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [rawKey, rawValue] of formData.entries()) {
    const path = rawKey.replace(/\]/g, '').split('[').filter(Boolean);
    assignNestedValue(result, path, typeof rawValue === 'string' ? rawValue : rawValue.name);
  }

  return result;
}

function readResumeFromForm(form: HTMLFormElement): ResumePayload {
  const raw = formDataToObject(new FormData(form)) as Partial<ResumePayload>;
  return coerceResumeDraft({
    ...raw,
    links: (Array.isArray(raw.links) ? raw.links : []).map((link) => ({ ...createBlankLink(), ...link })),
    skills: (Array.isArray(raw.skills) ? raw.skills : []).map((skill) => ({ ...createBlankSkill(), ...skill })),
    companies: (Array.isArray(raw.companies) ? raw.companies : []).map((company) => ({
      ...createBlankCompany(),
      ...company,
      projects: (Array.isArray(company.projects) ? company.projects : []).map((project) => ({
        ...createBlankProject(),
        ...project,
      })),
    })),
    certifications: (Array.isArray(raw.certifications) ? raw.certifications : []).map((certification) => ({
      ...createBlankCertification(),
      ...certification,
    })),
  });
}

function flattenErrors(errors: Record<string, string[] | undefined> | undefined): string[] {
  if (!errors) {
    return [];
  }

  return Object.values(errors).flatMap((messages) => messages ?? []);
}

function extractFilename(disposition: string | null, fallback: string): string {
  const match = disposition?.match(/filename="?([^";]+)"?/);
  return match?.[1] ?? fallback;
}

async function parseErrorMessage(response: Response): Promise<{ message: string; errors?: Record<string, string[]> }> {
  try {
    const payload = (await response.json()) as { message?: string; errors?: Record<string, string[]> };
    return { message: payload.message ?? '処理に失敗しました。', errors: payload.errors };
  } catch {
    return { message: '処理に失敗しました。' };
  }
}

function saveDraft(resume: ResumePayload): void {
  try {
    const { as_of_date, ...draft } = resume;
    localStorage.setItem(draftStorageKey, JSON.stringify(draft));
  } catch {
    // localStorageが使えなくても入力は継続する。
  }
}

function loadDraft(initialResume: ResumePayload): ResumePayload {
  try {
    const raw = localStorage.getItem(draftStorageKey);
    if (!raw) {
      return initialResume;
    }

    return coerceResumeDraft({
      ...JSON.parse(raw),
      as_of_date: toDateInputValue(),
    } as Partial<ResumePayload>);
  } catch {
    return initialResume;
  }
}

function updatePreview(state: AppState): void {
  const preview = document.getElementById('resume-preview');
  const stats = document.getElementById('resume-preview-stats');
  if (!preview || !stats) {
    return;
  }

  const normalized = normalizeResumeData(state.resume);
  preview.innerHTML = renderResumePreviewHtml(normalized);
  const projectCount = state.resume.companies.reduce((total, company) => total + company.projects.length, 0);
  stats.textContent = `${state.resume.companies.length} companies · ${projectCount} projects · ${state.resume.skills.length} skills`;
}

function syncStateFromForm(state: AppState, root: HTMLElement): void {
  const form = root.querySelector<HTMLFormElement>('#resume-form');
  if (!form) {
    return;
  }

  state.resume = readResumeFromForm(form);
  state.aiConsent = root.querySelector<HTMLInputElement>('#ai_consent')?.checked ?? false;
  state.validationMessages = [];
}

function render(state: AppState, bootstrap: BootstrapPayload, root: HTMLElement): void {
  root.innerHTML = renderFormHtml(state, bootstrap);
  updatePreview(state);
}

async function handleDownload(state: AppState, bootstrap: BootstrapPayload, root: HTMLElement, kind: 'pdf' | 'docx'): Promise<void> {
  syncStateFromForm(state, root);
  const form = root.querySelector<HTMLFormElement>('#resume-form');
  if (!form?.reportValidity()) {
    return;
  }

  const response = await fetch(kind === 'pdf' ? bootstrap.endpoints.downloadPdf : bootstrap.endpoints.downloadDocx, {
    method: 'POST',
    headers: {
      Accept: kind === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(state.resume),
  });

  if (!response.ok) {
    const payload = await parseErrorMessage(response);
    state.validationMessages = flattenErrors(payload.errors);
    if (!state.validationMessages.length && payload.message) {
      state.validationMessages = [payload.message];
    }
    render(state, bootstrap, root);
    return;
  }

  const blob = await response.blob();
  const fileName = extractFilename(
    response.headers.get('content-disposition'),
    kind === 'pdf' ? 'resume.pdf' : 'resume.docx',
  );
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(href);
}

async function handleGenerateSummary(state: AppState, bootstrap: BootstrapPayload, root: HTMLElement): Promise<void> {
  syncStateFromForm(state, root);
  const form = root.querySelector<HTMLFormElement>('#resume-form');
  if (!state.aiConsent || !form?.reportValidity()) {
    return;
  }

  state.summaryLoading = true;
  state.summaryError = '';
  render(state, bootstrap, root);

  try {
    const response = await fetch(bootstrap.endpoints.summary, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ai_consent: true,
        ...buildSummaryCareerData(normalizeResumeData(state.resume)),
      }),
    });
    const payload = (await response.json()) as { summary?: string; message?: string; errors?: Record<string, string[]> };

    if (!response.ok || !payload.summary) {
      state.summaryError = payload.message ?? '職務要約を生成できませんでした。';
      state.validationMessages = flattenErrors(payload.errors);
    } else {
      state.resume.summary = payload.summary;
      state.validationMessages = [];
      saveDraft(state.resume);
    }
  } catch {
    state.summaryError = '職務要約を生成できませんでした。';
  } finally {
    state.summaryLoading = false;
    render(state, bootstrap, root);
  }
}

export function initResumeForm(): void {
  const root = document.getElementById('resume-form-root');
  const bootstrap = getBootstrap();
  if (!root || !bootstrap) {
    return;
  }

  const state: AppState = {
    resume: loadDraft(bootstrap.initialResume),
    aiConsent: false,
    summaryLoading: false,
    summaryError: '',
    validationMessages: [],
  };

  render(state, bootstrap, root);

  root.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
      return;
    }

    syncStateFromForm(state, root);
    if (target.name.endsWith('[category]')) {
      state.resume = coerceResumeDraft(state.resume);
      render(state, bootstrap, root);
      const refocused = root.querySelector<HTMLElement>(`[name="${CSS.escape(target.name)}"]`);
      refocused?.focus();
      if (refocused instanceof HTMLInputElement || refocused instanceof HTMLTextAreaElement) {
        refocused.selectionStart = refocused.value.length;
        refocused.selectionEnd = refocused.value.length;
      }
      return;
    }

    updatePreview(state);
    saveDraft(state.resume);
  });

  root.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
      return;
    }

    syncStateFromForm(state, root);
    updatePreview(state);
    saveDraft(state.resume);

    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      render(state, bootstrap, root);
      return;
    }

    if (target.dataset.rerender === 'true') {
      render(state, bootstrap, root);
    }
  });

  root.addEventListener('click', async (event) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-action]');
    if (!target) {
      return;
    }

    syncStateFromForm(state, root);

    switch (target.dataset.action) {
      case 'add-link':
        state.resume.links.push(createBlankLink());
        break;
      case 'remove-link': {
        const index = Number(target.dataset.index);
        if (state.resume.links.length > 1) {
          state.resume.links.splice(index, 1);
        }
        break;
      }
      case 'add-skill':
        state.resume.skills.push(createBlankSkill());
        break;
      case 'remove-skill': {
        const index = Number(target.dataset.index);
        if (state.resume.skills.length > 1) {
          state.resume.skills.splice(index, 1);
        }
        break;
      }
      case 'add-company':
        state.resume.companies.push(createBlankCompany());
        break;
      case 'remove-company': {
        const index = Number(target.dataset.index);
        if (state.resume.companies.length > 1) {
          state.resume.companies.splice(index, 1);
        }
        break;
      }
      case 'add-project': {
        const companyIndex = Number(target.dataset.companyIndex);
        state.resume.companies[companyIndex]?.projects.push(createBlankProject());
        break;
      }
      case 'remove-project': {
        const companyIndex = Number(target.dataset.companyIndex);
        const projectIndex = Number(target.dataset.projectIndex);
        const company = state.resume.companies[companyIndex];
        if (company && company.projects.length > 1) {
          company.projects.splice(projectIndex, 1);
        }
        break;
      }
      case 'add-certification':
        state.resume.certifications.push(createBlankCertification());
        break;
      case 'remove-certification': {
        const index = Number(target.dataset.index);
        if (state.resume.certifications.length > 1) {
          state.resume.certifications.splice(index, 1);
        }
        break;
      }
      case 'generate-summary':
        await handleGenerateSummary(state, bootstrap, root);
        return;
      case 'download-pdf':
        await handleDownload(state, bootstrap, root, 'pdf');
        return;
      case 'download-docx':
        await handleDownload(state, bootstrap, root, 'docx');
        return;
      case 'clear-draft':
        if (!window.confirm('この端末に保存した入力中の下書きを削除しますか？')) {
          return;
        }
        localStorage.removeItem(draftStorageKey);
        state.resume = createBlankResume();
        state.resume.as_of_date = toDateInputValue();
        state.aiConsent = false;
        state.summaryError = '';
        state.validationMessages = [];
        break;
      case 'print-preview':
        window.print();
        return;
      default:
        return;
    }

    saveDraft(state.resume);
    render(state, bootstrap, root);
  });
}
