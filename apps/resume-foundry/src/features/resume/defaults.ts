import type {
  ResumeCertification,
  ResumeCompany,
  ResumeLink,
  ResumePayload,
  ResumeProject,
  ResumeSkill,
} from './types';

export const SKILL_CATEGORY_ORDER = [
  '担当業務',
  '言語',
  'フレームワーク',
  'ミドルウェア',
  'OS',
  'インフラ',
  'データベース',
  'デザインツール',
  '開発ツール・その他',
] as const;

export const LINK_TYPES = ['GitHub', 'Qiita', 'Zenn', 'ポートフォリオ', 'その他'] as const;
export const SKILL_LEVELS = ['業務使用', '個人開発', '自己研鑽'] as const;
export const EMPLOYMENT_TYPES = [
  '正社員',
  '契約社員',
  '派遣社員',
  'パート・アルバイト',
  '業務委託',
  'フリーランス',
  '役員',
  'その他',
] as const;

export function toDateInputValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function createBlankLink(): ResumeLink {
  return { type: '', type_custom: '', url: '' };
}

export function createBlankSkill(): ResumeSkill {
  return { category: '', name: '', years: '', level: '', note: '' };
}

export function createBlankProject(): ResumeProject {
  return {
    period_from: '',
    period_to: '',
    is_current: false,
    name: '',
    description: '',
    role: '',
    role_custom: '',
    team: '',
    processes: '',
    technologies: '',
  };
}

export function createBlankCompany(): ResumeCompany {
  return {
    name: '',
    employment_type: '',
    employment_type_custom: '',
    is_current: false,
    period_from: '',
    period_to: '',
    industry: '',
    business_overview: '',
    established: '',
    capital: '',
    employees: '',
    projects: [],
  };
}

export function createBlankCertification(): ResumeCertification {
  return { date: '', name: '' };
}

export function createBlankResume(date = new Date()): ResumePayload {
  return {
    full_name: '',
    as_of_date: toDateInputValue(date),
    summary: '',
    specialty: '',
    links: [createBlankLink()],
    skills: [createBlankSkill()],
    companies: [createBlankCompany()],
    certifications: [createBlankCertification()],
    self_pr: '',
    considerations: '',
  };
}
