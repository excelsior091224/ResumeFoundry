import type {
  ResumeCertification,
  ResumeCompany,
  ResumeLink,
  ResumePayload,
  ResumeProject,
  ResumeSkill,
} from './types';

function escapeHtml(value: string | undefined | null): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };

    return entities[character] ?? character;
  });
}

function withBreaks(value: string | undefined | null): string {
  return escapeHtml(value).replace(/\r\n|\r|\n/g, '<br>');
}

export function displayLinkType(link: ResumeLink): string {
  return link.type === 'その他' ? link.type_custom : link.type;
}

export function displayRole(project: ResumeProject): string {
  return project.role === 'その他' ? project.role_custom : project.role;
}

export function displayCompanyName(company: ResumeCompany): string {
  if (company.name) {
    return company.name;
  }

  return company.employment_type === 'フリーランス' ? 'フリーランス' : '所属企業名未入力';
}

export function formatMonth(value: string): string {
  return /^\d{4}-\d{2}$/.test(value) ? `${value.replace('-', '年')}月` : value;
}

function renderLinks(links: ResumeLink[]): string {
  const rows = links
    .filter((link) => link.url)
    .map((link) => `<li><span>${escapeHtml(displayLinkType(link))}：</span>${escapeHtml(link.url)}</li>`)
    .join('');

  return rows ? `<ul>${rows}</ul>` : '<p class="empty-note">技術系アカウントやポートフォリオを入力してください</p>';
}

function renderSkills(skills: ResumeSkill[]): string {
  if (!skills.length) {
    return '<tr><td colspan="5" class="empty-note">スキルを入力してください</td></tr>';
  }

  return skills
    .map(
      (skill) => `
        <tr>
          <td>${escapeHtml(skill.category || '未分類')}</td>
          <td>${escapeHtml(skill.name)}</td>
          <td>${escapeHtml(skill.years)}</td>
          <td>${escapeHtml(skill.level)}</td>
          <td>${escapeHtml(skill.note)}</td>
        </tr>`,
    )
    .join('');
}

function renderProjects(projects: ResumeProject[]): string {
  const validProjects = projects.filter(
    (project) =>
      project.name ||
      project.description ||
      project.processes ||
      project.technologies ||
      project.role ||
      project.role_custom ||
      project.team,
  );

  if (!validProjects.length) {
    return '';
  }

  return validProjects
    .map((project) => {
      const projectPeriod = [project.period_from, project.period_to].filter(Boolean).join('〜');
      const periodText = projectPeriod ? `（${escapeHtml(projectPeriod)}）` : '';
      const projectTitle = project.name
        ? `■ ${escapeHtml(project.name)}${periodText}`
        : periodText
        ? `■ ${periodText}`
        : '';

      const roleStr = displayRole(project);
      const teamStr = project.team;
      const roleTeamText = [roleStr, teamStr].filter(Boolean).map(escapeHtml).join(' / ');

      return `
        <div class="project-block">
          ${projectTitle ? `<p class="project-title">${projectTitle}</p>` : ''}
          ${project.description ? `<p class="project-detail">${withBreaks(project.description)}</p>` : ''}
          ${project.processes ? `<p class="project-detail"><b>【担当工程】</b><br>${withBreaks(project.processes)}</p>` : ''}
          ${project.technologies ? `<p class="project-detail"><b>【使用技術・DB・OS】</b><br>${withBreaks(project.technologies)}</p>` : ''}
          ${roleTeamText ? `<p class="project-detail"><b>【組織・役割】</b><br>${withBreaks(roleTeamText)}</p>` : ''}
        </div>`;
    })
    .join('');
}

function renderCompanies(companies: ResumeCompany[]): string {
  if (!companies.length) {
    return '<p class="empty-note">所属企業とプロジェクトを入力してください</p>';
  }

  return companies
    .map((company) => {
      const companyPeriod = [company.period_from, company.period_to].filter(Boolean).join('〜');
      const companyMeta = [
        company.employment_type === 'その他' ? company.employment_type_custom : company.employment_type,
        company.industry,
        company.established ? `設立：${company.established}` : '',
        company.capital ? `資本金：${company.capital}` : '',
        company.employees ? `従業員数：${company.employees}` : '',
      ]
        .filter(Boolean)
        .join(' / ');

      return `
        <div class="company-block">
          <p class="company-title">勤務先：${escapeHtml(displayCompanyName(company))}（${escapeHtml(companyPeriod)}）</p>
          ${companyMeta ? `<p class="project-detail">${escapeHtml(companyMeta)}</p>` : ''}
          ${company.business_overview ? `<p class="project-detail"><b>【業務概要】</b><br>${withBreaks(company.business_overview)}</p>` : ''}
          ${renderProjects(company.projects)}
        </div>`;
    })
    .join('');
}

function renderCertifications(certifications: ResumeCertification[]): string {
  const rows = certifications
    .filter((certification) => certification.name)
    .map(
      (certification) =>
        `<li>${escapeHtml(formatMonth(certification.date))}　${escapeHtml(certification.name)}</li>`,
    )
    .join('');

  return rows ? `<ul>${rows}</ul>` : '<p class="empty-note">資格を入力してください</p>';
}

export function renderResumePreviewHtml(resume: ResumePayload): string {
  return `
    <div class="paper-header">
      <h2>職務経歴書</h2>
      <div class="paper-meta">${escapeHtml(resume.as_of_date)}<br><b>氏名：${escapeHtml(resume.full_name)}</b></div>
    </div>

    <div class="paper-section">
      <h3>■ 職務要約</h3>
      <p class="summary-text">${withBreaks(resume.summary)}</p>
    </div>
    <div class="paper-section">
      <h3>■ 得意業務</h3>
      <p>・ ${escapeHtml(resume.specialty)}</p>
    </div>
    <div class="paper-section">
      <h3>■ 技術系アカウント・ポートフォリオ</h3>
      ${renderLinks(resume.links)}
    </div>

    <div class="paper-section">
      <h3>■ PCスキル / テクニカルスキル</h3>
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
        <tbody>${renderSkills(resume.skills)}</tbody>
      </table>
    </div>

    <div class="paper-section">
      <h3>■ 職務経歴</h3>
      ${renderCompanies(resume.companies)}
    </div>

    <div class="paper-section">
      <h3>■ 資格</h3>
      ${renderCertifications(resume.certifications)}
    </div>
    <div class="paper-section">
      <h3>■ 自己PR</h3>
      <p>${withBreaks(resume.self_pr)}</p>
    </div>
    ${
      resume.considerations
        ? `<div class="paper-section"><h3>■ 配慮事項</h3><p>${withBreaks(resume.considerations)}</p></div>`
        : ''
    }
    <div class="paper-closing">
      <p class="paper-closing-end">以上</p>
      <p class="paper-closing-message">是非、面接の機会をいただければと思います。何卒よろしくお願いいたします。</p>
    </div>`;
}
