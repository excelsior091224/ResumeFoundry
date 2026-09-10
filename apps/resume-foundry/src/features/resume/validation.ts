import {
  createBlankCertification,
  createBlankCompany,
  createBlankLink,
  createBlankProject,
  createBlankResume,
  createBlankSkill,
  EMPLOYMENT_TYPES,
  LINK_TYPES,
  SKILL_CATEGORY_ORDER,
  SKILL_LEVELS,
} from './defaults';
import type {
  ResumeCertification,
  ResumeCompany,
  ResumeLink,
  ResumePayload,
  ResumeProject,
  ResumeSkill,
  ResumeSummaryPayload,
  ValidationErrors,
} from './types';

const MAX_CAREER_DATA_LENGTH = 20000;

export class ResumeValidationError extends Error {
  public readonly status = 422;

  constructor(
    public readonly errors: ValidationErrors,
    message = '入力内容を確認してください。',
  ) {
    super(message);
    this.name = 'ResumeValidationError';
  }
}

function addError(errors: ValidationErrors, path: string, message: string): void {
  errors[path] ??= [];
  errors[path].push(message);
}

function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function booleanValue(value: unknown): boolean {
  return value === true || value === 'true' || value === '1' || value === 1 || value === 'on';
}

function hasAnyValue(item: Record<string, unknown> | null | undefined, keys: string[]): boolean {
  if (!item) {
    return false;
  }

  return keys.some((key) => {
    const value = item[key];
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return trimString(value) !== '';
  });
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidMonth(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month] = value.split('-').map(Number);
  return year >= 1900 && month >= 1 && month <= 12;
}

function ensureLength(
  errors: ValidationErrors,
  path: string,
  label: string,
  value: string,
  max: number,
): void {
  if (value.length > max) {
    addError(errors, path, `${label}は${max}文字以内で入力してください。`);
  }
}

function ensureAllowed(
  errors: ValidationErrors,
  path: string,
  label: string,
  value: string,
  allowed: readonly string[],
  required = false,
): void {
  if (!value) {
    if (required) {
      addError(errors, path, `${label}は必須です。`);
    }
    return;
  }

  if (!allowed.includes(value)) {
    addError(errors, path, `${label}の値が不正です。`);
  }
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function sortDateValue(value: string): number {
  if (!value || !isValidMonth(value)) {
    return 0;
  }

  return Date.parse(`${value}-01T00:00:00Z`) || 0;
}

function compareByDateDesc(left: string, right: string): number {
  return sortDateValue(right) - sortDateValue(left);
}

function validateUrl(errors: ValidationErrors, path: string, value: string): void {
  if (!value) {
    return;
  }

  if (value.length > 500) {
    addError(errors, path, 'URLは500文字以内で入力してください。');
    return;
  }

  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      addError(errors, path, 'URLはhttp://またはhttps://で入力してください。');
    }
  } catch {
    addError(errors, path, 'URLの形式が正しくありません。');
  }
}

export function normalizeResumeData(input: Partial<ResumePayload>): ResumePayload {
  const base = createBlankResume();
  const links = safeArray<Record<string, unknown>>(input.links)
    .filter((link) => hasAnyValue(link, ['type', 'type_custom', 'url']))
    .map<ResumeLink>((link) => ({
      ...createBlankLink(),
      type: trimString(link.type),
      type_custom: trimString(link.type_custom),
      url: trimString(link.url),
    }));

  const skills = safeArray<Record<string, unknown>>(input.skills)
    .filter((skill) => hasAnyValue(skill, ['category', 'name', 'years', 'level', 'note']))
    .map<ResumeSkill>((skill) => {
      const category = trimString(skill.category);

      return {
        ...createBlankSkill(),
        category,
        name: trimString(skill.name),
        years: trimString(skill.years),
        level: category === '担当業務' ? '' : trimString(skill.level),
        note: trimString(skill.note),
      };
    })
    .sort((left, right) => {
      const leftOrder = SKILL_CATEGORY_ORDER.indexOf(left.category as (typeof SKILL_CATEGORY_ORDER)[number]);
      const rightOrder = SKILL_CATEGORY_ORDER.indexOf(
        right.category as (typeof SKILL_CATEGORY_ORDER)[number],
      );
      const normalizedLeftOrder = leftOrder === -1 ? SKILL_CATEGORY_ORDER.length : leftOrder;
      const normalizedRightOrder = rightOrder === -1 ? SKILL_CATEGORY_ORDER.length : rightOrder;

      if (normalizedLeftOrder !== normalizedRightOrder) {
        return normalizedLeftOrder - normalizedRightOrder;
      }

      return left.name.localeCompare(right.name, 'ja');
    });

  const companies = safeArray<Record<string, unknown>>(input.companies)
    .filter((company) =>
      hasAnyValue(company, [
        'name',
        'employment_type',
        'employment_type_custom',
        'is_current',
        'period_from',
        'period_to',
        'industry',
        'business_overview',
        'established',
        'capital',
        'employees',
        'projects',
      ]),
    )
    .map<ResumeCompany>((company) => {
      const projects = safeArray<Record<string, unknown>>(company.projects)
        .filter((project) =>
          hasAnyValue(project, [
            'period_from',
            'period_to',
            'is_current',
            'name',
            'description',
            'role',
            'role_custom',
            'team',
            'processes',
            'technologies',
          ]),
        )
        .map<ResumeProject>((project) => ({
          ...createBlankProject(),
          period_from: trimString(project.period_from),
          period_to: booleanValue(project.is_current) ? '' : trimString(project.period_to),
          is_current: booleanValue(project.is_current),
          name: trimString(project.name),
          description: trimString(project.description),
          role: trimString(project.role),
          role_custom: trimString(project.role_custom),
          team: trimString(project.team),
          processes: trimString(project.processes),
          technologies: trimString(project.technologies),
        }))
        .sort((left, right) => compareByDateDesc(left.period_from, right.period_from));

      const employmentType = trimString(company.employment_type);
      const trimmedName = trimString(company.name);

      return {
        ...createBlankCompany(),
        name: trimmedName || (employmentType === 'フリーランス' ? 'フリーランス' : ''),
        employment_type: employmentType,
        employment_type_custom: trimString(company.employment_type_custom),
        is_current: booleanValue(company.is_current),
        period_from: trimString(company.period_from),
        period_to: booleanValue(company.is_current) ? '' : trimString(company.period_to),
        industry: trimString(company.industry),
        business_overview: trimString(company.business_overview),
        established: trimString(company.established),
        capital: trimString(company.capital),
        employees: trimString(company.employees),
        projects,
      };
    })
    .sort((left, right) => compareByDateDesc(left.period_from, right.period_from));

  const certifications = safeArray<Record<string, unknown>>(input.certifications)
    .filter((item) => hasAnyValue(item, ['date', 'name']))
    .map<ResumeCertification>((item) => ({
      ...createBlankCertification(),
      date: trimString(item.date),
      name: trimString(item.name),
    }))
    .sort((left, right) => compareByDateDesc(left.date, right.date));

  return {
    ...base,
    full_name: trimString(input.full_name),
    as_of_date: trimString(input.as_of_date),
    summary: trimString(input.summary),
    specialty: trimString(input.specialty),
    links,
    skills,
    companies,
    certifications,
    self_pr: trimString(input.self_pr),
    considerations: trimString(input.considerations),
  };
}

export function coerceResumeDraft(input: Partial<ResumePayload>): ResumePayload {
  const draft = {
    ...createBlankResume(),
    ...input,
  };

  return {
    ...draft,
    full_name: trimString(draft.full_name),
    as_of_date: trimString(draft.as_of_date),
    summary: trimString(draft.summary),
    specialty: trimString(draft.specialty),
    self_pr: trimString(draft.self_pr),
    considerations: trimString(draft.considerations),
    links: (Array.isArray(draft.links) && draft.links.length ? draft.links : [createBlankLink()]).map((link) => ({
      ...createBlankLink(),
      ...link,
      type: trimString(link.type),
      type_custom: trimString(link.type_custom),
      url: trimString(link.url),
    })),
    skills: (Array.isArray(draft.skills) && draft.skills.length ? draft.skills : [createBlankSkill()]).map(
      (skill) => ({
        ...createBlankSkill(),
        ...skill,
        category: trimString(skill.category),
        name: trimString(skill.name),
        years: trimString(skill.years),
        level: trimString(skill.category) === '担当業務' ? '' : trimString(skill.level),
        note: trimString(skill.note),
      }),
    ),
    companies: (Array.isArray(draft.companies) && draft.companies.length
      ? draft.companies
      : [createBlankCompany()]
    ).map((company) => ({
      ...createBlankCompany(),
      ...company,
      name: trimString(company.name),
      employment_type: trimString(company.employment_type),
      employment_type_custom: trimString(company.employment_type_custom),
      is_current: booleanValue(company.is_current),
      period_from: trimString(company.period_from),
      period_to: booleanValue(company.is_current) ? '' : trimString(company.period_to),
      industry: trimString(company.industry),
      business_overview: trimString(company.business_overview),
      established: trimString(company.established),
      capital: trimString(company.capital),
      employees: trimString(company.employees),
      projects: (Array.isArray(company.projects) && company.projects.length
        ? company.projects
        : [createBlankProject()]
      ).map((project) => ({
        ...createBlankProject(),
        ...project,
        period_from: trimString(project.period_from),
        period_to: booleanValue(project.is_current) ? '' : trimString(project.period_to),
        is_current: booleanValue(project.is_current),
        name: trimString(project.name),
        description: trimString(project.description),
        role: trimString(project.role),
        role_custom: trimString(project.role_custom),
        team: trimString(project.team),
        processes: trimString(project.processes),
        technologies: trimString(project.technologies),
      })),
    })),
    certifications: (
      Array.isArray(draft.certifications) && draft.certifications.length
        ? draft.certifications
        : [createBlankCertification()]
    ).map((certification) => ({
      ...createBlankCertification(),
      ...certification,
      date: trimString(certification.date),
      name: trimString(certification.name),
    })),
  };
}

export function validateResumePayload(input: unknown): ResumePayload {
  const errors: ValidationErrors = {};
  const data = normalizeResumeData((typeof input === 'object' && input ? input : {}) as Partial<ResumePayload>);

  if (!data.full_name) {
    addError(errors, 'full_name', '氏名は必須です。');
  }
  ensureLength(errors, 'full_name', '氏名', data.full_name, 100);

  if (!data.as_of_date) {
    addError(errors, 'as_of_date', '基準日は必須です。');
  } else if (!isValidDate(data.as_of_date)) {
    addError(errors, 'as_of_date', '基準日はYYYY-MM-DD形式で入力してください。');
  }

  ensureLength(errors, 'summary', '職務要約', data.summary, 3000);
  ensureLength(errors, 'specialty', '得意業務', data.specialty, 500);
  ensureLength(errors, 'self_pr', '自己PR', data.self_pr, 5000);
  ensureLength(errors, 'considerations', '配慮事項', data.considerations, 5000);

  if (data.links.length > 10) {
    addError(errors, 'links', 'リンクは10件以内で入力してください。');
  }
  data.links.forEach((link, index) => {
    const path = `links.${index}`;
    ensureAllowed(errors, `${path}.type`, 'リンク種別', link.type, LINK_TYPES);
    ensureLength(errors, `${path}.type_custom`, 'リンク種別(その他)', link.type_custom, 100);
    if (link.type === 'その他' && !link.type_custom) {
      addError(errors, `${path}.type_custom`, 'リンク種別が「その他」の場合は、サイト名を入力してください。');
    }
    validateUrl(errors, `${path}.url`, link.url);
  });

  if (data.skills.length > 100) {
    addError(errors, 'skills', 'スキルは100件以内で入力してください。');
  }
  data.skills.forEach((skill, index) => {
    const path = `skills.${index}`;
    if (!skill.category) {
      addError(errors, `${path}.category`, 'カテゴリは必須です。');
    }
    ensureLength(errors, `${path}.category`, 'カテゴリ', skill.category, 50);
    if (!skill.name) {
      addError(errors, `${path}.name`, 'スキル名は必須です。');
    }
    ensureLength(errors, `${path}.name`, 'スキル名', skill.name, 100);
    ensureLength(errors, `${path}.years`, '経験年数', skill.years, 30);
    ensureAllowed(errors, `${path}.level`, '経験区分', skill.level, SKILL_LEVELS);
    ensureLength(errors, `${path}.note`, '備考', skill.note, 200);
  });

  if (data.companies.length > 20) {
    addError(errors, 'companies', '所属企業は20件以内で入力してください。');
  }
  data.companies.forEach((company, companyIndex) => {
    const path = `companies.${companyIndex}`;
    ensureLength(errors, `${path}.name`, '企業名', company.name, 200);
    ensureAllowed(errors, `${path}.employment_type`, '雇用形態', company.employment_type, EMPLOYMENT_TYPES, true);
    ensureLength(
      errors,
      `${path}.employment_type_custom`,
      '雇用形態(その他)',
      company.employment_type_custom,
      100,
    );
    if (company.employment_type === 'その他' && !company.employment_type_custom) {
      addError(
        errors,
        `${path}.employment_type_custom`,
        '雇用形態が「その他」の場合は、契約形態を入力してください。',
      );
    }
    if (company.period_from && !isValidMonth(company.period_from)) {
      addError(errors, `${path}.period_from`, '在籍開始年月はYYYY-MM形式で入力してください。');
    }
    if (company.period_to && !isValidMonth(company.period_to)) {
      addError(errors, `${path}.period_to`, '在籍終了年月はYYYY-MM形式で入力してください。');
    }
    if (!company.is_current && company.period_from && company.period_to && company.period_to < company.period_from) {
      addError(errors, `${path}.period_to`, '終了日は開始日以降で入力してください。');
    }
    ensureLength(errors, `${path}.industry`, '事業内容', company.industry, 200);
    ensureLength(errors, `${path}.business_overview`, '業務概要', company.business_overview, 1000);
    ensureLength(errors, `${path}.established`, '設立', company.established, 50);
    ensureLength(errors, `${path}.capital`, '資本金', company.capital, 100);
    ensureLength(errors, `${path}.employees`, '従業員数', company.employees, 100);

    if (company.projects.length > 30) {
      addError(errors, `${path}.projects`, 'プロジェクトは30件以内で入力してください。');
    }
    company.projects.forEach((project, projectIndex) => {
      const projectPath = `${path}.projects.${projectIndex}`;
      if (project.period_from && !isValidMonth(project.period_from)) {
        addError(errors, `${projectPath}.period_from`, 'プロジェクト開始年月はYYYY-MM形式で入力してください。');
      }
      if (project.period_to && !isValidMonth(project.period_to)) {
        addError(errors, `${projectPath}.period_to`, 'プロジェクト終了年月はYYYY-MM形式で入力してください。');
      }
      if (!project.is_current && project.period_from && project.period_to && project.period_to < project.period_from) {
        addError(errors, `${projectPath}.period_to`, 'プロジェクトの終了日は開始日以降で入力してください。');
      }
      if (!project.name) {
        addError(errors, `${projectPath}.name`, 'プロジェクト名は必須です。');
      }
      ensureLength(errors, `${projectPath}.name`, 'プロジェクト名', project.name, 200);
      ensureLength(errors, `${projectPath}.description`, '業務内容', project.description, 3000);
      ensureLength(errors, `${projectPath}.role`, '役割', project.role, 100);
      ensureLength(errors, `${projectPath}.role_custom`, '役割(その他)', project.role_custom, 100);
      if (project.role === 'その他' && !project.role_custom) {
        addError(
          errors,
          `${projectPath}.role_custom`,
          '担当工程が「その他」の場合は、具体的な役割を入力してください。',
        );
      }
      ensureLength(errors, `${projectPath}.team`, 'チーム構成', project.team, 500);
      ensureLength(errors, `${projectPath}.processes`, '担当工程', project.processes, 500);
      ensureLength(errors, `${projectPath}.technologies`, '使用技術', project.technologies, 500);
    });
  });

  if (data.certifications.length > 30) {
    addError(errors, 'certifications', '資格は30件以内で入力してください。');
  }
  data.certifications.forEach((certification, index) => {
    const path = `certifications.${index}`;
    if (certification.date && !isValidMonth(certification.date)) {
      addError(errors, `${path}.date`, '資格取得年月はYYYY-MM形式で入力してください。');
    }
    if (!certification.name) {
      addError(errors, `${path}.name`, '資格名は必須です。');
    }
    ensureLength(errors, `${path}.name`, '資格名', certification.name, 200);
  });

  if (Object.keys(errors).length > 0) {
    throw new ResumeValidationError(errors);
  }

  return data;
}

export function buildSummaryCareerData(
  resume: ResumePayload,
): Omit<ResumeSummaryPayload, 'ai_consent'> {
  return {
    companies: resume.companies.map((company) => ({
      ...company,
      is_current: false,
      projects: company.projects.map((project) => ({
        ...project,
        is_current: false,
      })),
    })),
    skills: resume.skills,
    certifications: resume.certifications,
  };
}

export function validateSummaryPayload(input: unknown): ResumeSummaryPayload {
  const source = (typeof input === 'object' && input ? input : {}) as Record<string, unknown>;
  const errors: ValidationErrors = {};
  const aiConsent = booleanValue(source.ai_consent);

  if (!aiConsent) {
    addError(errors, 'ai_consent', 'AI利用への同意が必要です。');
  }

  const skills = safeArray<Record<string, unknown>>(source.skills).map<ResumeSkill>((skill, index) => {
    const path = `skills.${index}`;
    const item = {
      ...createBlankSkill(),
      category: trimString(skill.category),
      name: trimString(skill.name),
      years: trimString(skill.years),
      level: trimString(skill.level),
      note: trimString(skill.note),
    };

    ensureLength(errors, `${path}.category`, 'カテゴリ', item.category, 50);
    ensureLength(errors, `${path}.name`, 'スキル名', item.name, 100);
    ensureLength(errors, `${path}.years`, '経験年数', item.years, 30);
    ensureLength(errors, `${path}.level`, '経験区分', item.level, 30);
    ensureLength(errors, `${path}.note`, '備考', item.note, 200);
    return item;
  });

  const companies = safeArray<Record<string, unknown>>(source.companies)
    .map<ResumeCompany | null>((company, companyIndex) => {
      const rawProjects = safeArray<Record<string, unknown>>(company.projects);
      const projects = rawProjects
        .map<ResumeProject | null>((project, projectIndex) => {
          const item = {
            ...createBlankProject(),
            period_from: trimString(project.period_from),
            period_to: trimString(project.period_to),
            name: trimString(project.name),
            description: trimString(project.description),
            role: trimString(project.role),
            role_custom: trimString(project.role_custom),
            team: trimString(project.team),
            processes: trimString(project.processes),
            technologies: trimString(project.technologies),
          };
          const path = `companies.${companyIndex}.projects.${projectIndex}`;

          if (item.period_from && !isValidMonth(item.period_from)) {
            addError(errors, `${path}.period_from`, 'プロジェクト開始年月はYYYY-MM形式で入力してください。');
          }
          if (item.period_to && !isValidMonth(item.period_to)) {
            addError(errors, `${path}.period_to`, 'プロジェクト終了年月はYYYY-MM形式で入力してください。');
          }
          ensureLength(errors, `${path}.name`, 'プロジェクト名', item.name, 200);
          ensureLength(errors, `${path}.description`, '業務内容', item.description, 3000);
          ensureLength(errors, `${path}.role`, '役割', item.role, 100);
          ensureLength(errors, `${path}.role_custom`, '役割(その他)', item.role_custom, 100);
          ensureLength(errors, `${path}.team`, 'チーム構成', item.team, 500);
          ensureLength(errors, `${path}.processes`, '担当工程', item.processes, 500);
          ensureLength(errors, `${path}.technologies`, '使用技術', item.technologies, 500);

          return hasAnyValue(item as unknown as Record<string, unknown>, [
            'name',
            'period_from',
            'period_to',
            'description',
            'role',
            'role_custom',
            'team',
            'processes',
            'technologies',
          ])
            ? item
            : null;
        })
        .filter((project): project is ResumeProject => project !== null);

      const item = {
        ...createBlankCompany(),
        name: trimString(company.name),
        employment_type: trimString(company.employment_type),
        employment_type_custom: trimString(company.employment_type_custom),
        period_from: trimString(company.period_from),
        period_to: trimString(company.period_to),
        industry: trimString(company.industry),
        business_overview: trimString(company.business_overview),
        projects,
      };
      const path = `companies.${companyIndex}`;

      if (item.period_from && !isValidMonth(item.period_from)) {
        addError(errors, `${path}.period_from`, '在籍開始年月はYYYY-MM形式で入力してください。');
      }
      if (item.period_to && !isValidMonth(item.period_to)) {
        addError(errors, `${path}.period_to`, '在籍終了年月はYYYY-MM形式で入力してください。');
      }
      ensureLength(errors, `${path}.name`, '企業名', item.name, 200);
      ensureLength(errors, `${path}.employment_type`, '雇用形態', item.employment_type, 100);
      ensureLength(errors, `${path}.employment_type_custom`, '雇用形態(その他)', item.employment_type_custom, 100);
      ensureLength(errors, `${path}.industry`, '事業内容', item.industry, 200);
      ensureLength(errors, `${path}.business_overview`, '業務概要', item.business_overview, 1000);

      return hasAnyValue(item as unknown as Record<string, unknown>, [
        'name',
        'employment_type',
        'employment_type_custom',
        'period_from',
        'period_to',
        'industry',
        'business_overview',
        'projects',
      ])
        ? item
        : null;
    })
    .filter((company): company is ResumeCompany => company !== null);

  const certifications = safeArray<Record<string, unknown>>(source.certifications)
    .map<ResumeCertification | null>((certification, index) => {
      const item = {
        ...createBlankCertification(),
        date: trimString(certification.date),
        name: trimString(certification.name),
      };
      const path = `certifications.${index}`;

      ensureLength(errors, `${path}.date`, '資格取得年月', item.date, 30);
      ensureLength(errors, `${path}.name`, '資格名', item.name, 200);

      return hasAnyValue(item as unknown as Record<string, unknown>, ['date', 'name']) ? item : null;
    })
    .filter((certification): certification is ResumeCertification => certification !== null);

  if (skills.length > 100) {
    addError(errors, 'skills', 'スキルは100件以内で入力してください。');
  }
  if (companies.length > 20) {
    addError(errors, 'companies', '所属企業は20件以内で入力してください。');
  }
  if (certifications.length > 30) {
    addError(errors, 'certifications', '資格は30件以内で入力してください。');
  }

  if (Object.keys(errors).length > 0) {
    throw new ResumeValidationError(errors);
  }

  if (!companies.length && !skills.length && !certifications.length) {
    throw new ResumeValidationError(
      { career: ['職歴、スキル、資格のいずれかを入力してください。'] },
      '職歴、スキル、資格のいずれかを入力してください。',
    );
  }

  const payload: ResumeSummaryPayload = { ai_consent: aiConsent, companies, skills, certifications };
  const careerJson = JSON.stringify({ companies, skills, certifications });
  if (careerJson.length > MAX_CAREER_DATA_LENGTH) {
    throw new ResumeValidationError(
      { career: ['AI要約に送信できる職歴情報の文字数を超えています。'] },
      'AI要約に送信できる職歴情報の文字数を超えています。',
    );
  }

  return payload;
}
