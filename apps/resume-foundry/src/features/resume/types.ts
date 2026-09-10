export interface ResumeLink {
  type: string;
  type_custom: string;
  url: string;
}

export interface ResumeSkill {
  category: string;
  name: string;
  years: string;
  level: string;
  note: string;
}

export interface ResumeProject {
  period_from: string;
  period_to: string;
  is_current: boolean;
  name: string;
  description: string;
  role: string;
  role_custom: string;
  team: string;
  processes: string;
  technologies: string;
}

export interface ResumeCompany {
  name: string;
  employment_type: string;
  employment_type_custom: string;
  is_current: boolean;
  period_from: string;
  period_to: string;
  industry: string;
  business_overview: string;
  established: string;
  capital: string;
  employees: string;
  projects: ResumeProject[];
}

export interface ResumeCertification {
  date: string;
  name: string;
}

export interface ResumePayload {
  full_name: string;
  as_of_date: string;
  summary: string;
  specialty: string;
  links: ResumeLink[];
  skills: ResumeSkill[];
  companies: ResumeCompany[];
  certifications: ResumeCertification[];
  self_pr: string;
  considerations: string;
}

export interface ResumeSummaryPayload {
  ai_consent: boolean;
  skills: ResumeSkill[];
  companies: ResumeCompany[];
  certifications: ResumeCertification[];
}

export type ValidationErrors = Record<string, string[]>;

export interface SkillCategory {
  label: string;
  skills: string[];
}

export interface SkillCategoryMap {
  [key: string]: SkillCategory;
}

export interface TeamRoleOption {
  value: string;
  description: string;
}

export interface TeamRoleGroup {
  category: string;
  roles: TeamRoleOption[];
}
