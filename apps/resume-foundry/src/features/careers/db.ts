/// <reference types="@cloudflare/workers-types" />

import type {
  ResumeCertification,
  ResumeCompany,
  ResumeLink,
  ResumePayload,
  ResumeProject,
  ResumeSkill,
} from '../resume/types';
import { LINK_TYPES } from '../resume/defaults';
import teamRoleGroups from '../../data/team-roles.json';

const knownTeamRoles = new Set(teamRoleGroups.flatMap((group) => group.roles.map((role) => role.value)));

async function hashUserId(userId: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(userId));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export class AccountDeletedError extends Error {
  constructor() {
    super('このアカウントは削除済みです。');
    this.name = 'AccountDeletedError';
  }
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  summary: string;
  specialty: string;
  self_pr: string;
  considerations: string;
  as_of_date: string;
}

export interface CareerStats {
  companyCount: number;
  projectCount: number;
  skillCount: number;
  certificationCount: number;
  linkCount: number;
}

export async function ensureClerkUserExists(
  db: D1Database,
  userId: string,
  email?: string | null,
  displayName?: string | null,
): Promise<void> {
  const userIdHash = await hashUserId(userId);
  const deletedUser = await db
    .prepare(
      `SELECT 1
       FROM deleted_user_tombstones
       WHERE user_id_hash = ?
         AND deleted_at >= datetime('now', '-1 day')`,
    )
    .bind(userIdHash)
    .first();

  if (deletedUser) {
    throw new AccountDeletedError();
  }

  const normalizedEmail = email?.trim().toLowerCase() || `${userId}@clerk.invalid`;
  const normalizedDisplayName = displayName?.trim() || '';
  const hasVerifiedEmail = email?.trim() ? 1 : 0;

  await db.batch([
    db
      .prepare(
        `INSERT INTO users (id, email, display_name, auth_provider, provider_subject)
         VALUES (?, ?, ?, 'clerk', ?)
         ON CONFLICT(id) DO UPDATE SET
           email = CASE
             WHEN ? = 1 THEN excluded.email
             ELSE users.email
           END,
           auth_provider = 'clerk',
           provider_subject = excluded.provider_subject,
           updated_at = CURRENT_TIMESTAMP`,
      )
      .bind(userId, normalizedEmail, normalizedDisplayName, userId, hasVerifiedEmail),
    db
      .prepare(
        `INSERT INTO profiles (id, user_id, summary, specialty, self_pr, considerations, as_of_date)
         VALUES (?, ?, '', '', '', '', ?)
         ON CONFLICT(user_id) DO NOTHING`,
      )
      .bind(crypto.randomUUID(), userId, new Date().toISOString().split('T')[0]),
  ]);
}

export async function deleteUserData(db: D1Database, userId: string): Promise<void> {
  const userIdHash = await hashUserId(userId);

  await db.batch([
    db
      .prepare(
        `INSERT INTO deleted_user_tombstones (user_id_hash)
         VALUES (?)
         ON CONFLICT(user_id_hash) DO UPDATE SET deleted_at = CURRENT_TIMESTAMP`,
      )
      .bind(userIdHash),
    db.prepare(`DELETE FROM deleted_user_tombstones WHERE deleted_at < datetime('now', '-1 day')`),
    db
      .prepare(
        `DELETE FROM project_skills
         WHERE project_id IN (SELECT id FROM projects WHERE user_id = ?)
            OR skill_id IN (SELECT id FROM skills WHERE user_id = ?)`,
      )
      .bind(userId, userId),
    db.prepare('DELETE FROM ai_generations WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM exports WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM links WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM certifications WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM projects WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM skills WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM companies WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM profiles WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM users WHERE id = ?').bind(userId),
  ]);
}

export async function getCareerData(db: D1Database, userId: string): Promise<ResumePayload> {
  const userRow = await db
    .prepare(
      `SELECT u.display_name, p.summary, p.specialty, p.self_pr, p.considerations, p.as_of_date
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = ?`,
    )
    .bind(userId)
    .first<{
      display_name: string | null;
      summary: string | null;
      specialty: string | null;
      self_pr: string | null;
      considerations: string | null;
      as_of_date: string | null;
    }>();

  const linksResult = await db
    .prepare(
      'SELECT label, link_type, link_type_custom, url FROM links WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC',
    )
    .bind(userId)
    .all<{ label: string; link_type: string | null; link_type_custom: string | null; url: string }>();

  const skillsResult = await db
    .prepare('SELECT category, name, years, level, note FROM skills WHERE user_id = ? ORDER BY created_at ASC')
    .bind(userId)
    .all<{ category: string; name: string; years: string; level: string; note: string }>();

  const companiesResult = await db
    .prepare(
      `SELECT id, name, employment_type, employment_type_note, industry, business_summary, established, capital, employees,
              period_from, period_to, is_current, sort_order
       FROM companies
       WHERE user_id = ?
       ORDER BY sort_order ASC, period_from DESC`,
    )
    .bind(userId)
    .all<{
      id: string;
      name: string;
      employment_type: string;
      employment_type_note: string | null;
      industry: string | null;
      business_summary: string | null;
      established: string | null;
      capital: string | null;
      employees: string | null;
      period_from: string | null;
      period_to: string | null;
      is_current: number;
      sort_order: number;
    }>();

  const projectsResult = await db
    .prepare(
      `SELECT id, company_id, name, role, role_custom, team_size, period_from, period_to, is_current,
              description, responsibilities, achievements
       FROM projects
       WHERE user_id = ?
       ORDER BY sort_order ASC, period_from DESC`,
    )
    .bind(userId)
    .all<{
      id: string;
      company_id: string | null;
      name: string;
      role: string | null;
      role_custom: string | null;
      team_size: string | null;
      period_from: string | null;
      period_to: string | null;
      is_current: number;
      description: string | null;
      responsibilities: string | null;
      achievements: string | null;
    }>();

  const certsResult = await db
    .prepare('SELECT name, acquired_on FROM certifications WHERE user_id = ? ORDER BY sort_order ASC, acquired_on DESC')
    .bind(userId)
    .all<{ name: string; acquired_on: string | null }>();

  const links: ResumeLink[] = (linksResult.results || []).map((link) => {
    const type =
      link.link_type || (LINK_TYPES.includes(link.label as (typeof LINK_TYPES)[number]) ? link.label : 'その他');
    return {
      type,
      type_custom: link.link_type_custom || (type === 'その他' ? link.label : ''),
      url: link.url,
    };
  });

  const skills: ResumeSkill[] = (skillsResult.results || []).map((s: { category: string; name: string; years: string; level: string; note: string }) => ({
    category: s.category || '',
    name: s.name || '',
    years: s.years || '',
    level: s.level || '',
    note: s.note || '',
  }));

  const projectsByCompany = new Map<string, ResumeProject[]>();
  const unassignedProjects: ResumeProject[] = [];

  for (const p of projectsResult.results || []) {
    const role = p.role || '';
    const normalizedRole = !p.role_custom && role && role !== 'その他' && !knownTeamRoles.has(role) ? 'その他' : role;
    const proj: ResumeProject = {
      name: p.name || '',
      period_from: p.period_from || '',
      period_to: p.period_to || '',
      is_current: Boolean(p.is_current),
      description: p.description || '',
      role: normalizedRole,
      role_custom: p.role_custom || (normalizedRole === 'その他' && role !== 'その他' ? role : ''),
      team: p.team_size || '',
      processes: p.responsibilities || '',
      technologies: p.achievements || '',
    };

    if (p.company_id) {
      const existing = projectsByCompany.get(p.company_id) || [];
      existing.push(proj);
      projectsByCompany.set(p.company_id, existing);
    } else {
      unassignedProjects.push(proj);
    }
  }

  const companies: ResumeCompany[] = (companiesResult.results || []).map((c: {
    id: string;
    name: string;
    employment_type: string;
    employment_type_note: string | null;
    industry: string | null;
    business_summary: string | null;
    established: string | null;
    capital: string | null;
    employees: string | null;
    period_from: string | null;
    period_to: string | null;
    is_current: number;
    sort_order: number;
  }) => ({
    name: c.name || '',
    employment_type: c.employment_type || '正社員',
    employment_type_custom: c.employment_type_note || '',
    is_current: Boolean(c.is_current),
    period_from: c.period_from || '',
    period_to: c.period_to || '',
    industry: c.industry || '',
    business_overview: c.business_summary || '',
    established: c.established || '',
    capital: c.capital || '',
    employees: c.employees || '',
    projects: projectsByCompany.get(c.id) || [],
  }));

  if (unassignedProjects.length > 0) {
    if (companies.length === 0) {
      companies.push({
        name: '職歴情報',
        employment_type: '正社員',
        employment_type_custom: '',
        is_current: false,
        period_from: '',
        period_to: '',
        industry: '',
        business_overview: '',
        established: '',
        capital: '',
        employees: '',
        projects: unassignedProjects,
      });
    } else {
      companies[0].projects.push(...unassignedProjects);
    }
  }

  const certifications: ResumeCertification[] = (certsResult.results || []).map((c: { name: string; acquired_on: string | null }) => ({
    date: c.acquired_on || '',
    name: c.name || '',
  }));

  return {
    full_name: userRow?.display_name || '',
    as_of_date: userRow?.as_of_date || new Date().toISOString().split('T')[0],
    summary: userRow?.summary || '',
    specialty: userRow?.specialty || '',
    links: links.length > 0 ? links : [{ type: '', type_custom: '', url: '' }],
    skills: skills.length > 0 ? skills : [{ category: '', name: '', years: '', level: '', note: '' }],
    companies: companies.length > 0 ? companies : [],
    certifications: certifications.length > 0 ? certifications : [{ date: '', name: '' }],
    self_pr: userRow?.self_pr || '',
    considerations: userRow?.considerations || '',
  };
}

export async function saveCareerData(
  db: D1Database,
  userId: string,
  payload: ResumePayload,
): Promise<void> {
  const stmts: D1PreparedStatement[] = [];

  // 1. Update user & profile
  stmts.push(
    db.prepare('UPDATE users SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(payload.full_name, userId),
  );
  stmts.push(
    db
      .prepare(
        `UPDATE profiles
         SET summary = ?, specialty = ?, self_pr = ?, considerations = ?, as_of_date = ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
      )
      .bind(payload.summary, payload.specialty, payload.self_pr, payload.considerations, payload.as_of_date, userId),
  );

  // 2. Clear old children
  stmts.push(db.prepare('DELETE FROM links WHERE user_id = ?').bind(userId));
  stmts.push(db.prepare('DELETE FROM skills WHERE user_id = ?').bind(userId));
  stmts.push(db.prepare('DELETE FROM certifications WHERE user_id = ?').bind(userId));
  stmts.push(db.prepare('DELETE FROM projects WHERE user_id = ?').bind(userId));
  stmts.push(db.prepare('DELETE FROM companies WHERE user_id = ?').bind(userId));

  // 3. Insert links
  payload.links.forEach((link, idx) => {
    if (link.url) {
      const linkId = `lnk_${userId}_${idx}_${Date.now()}`;
      const label = link.type === 'その他' ? link.type_custom : link.type || 'Web';
      stmts.push(
        db
          .prepare(
            `INSERT INTO links (id, user_id, label, link_type, link_type_custom, url, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            linkId,
            userId,
            label,
            link.type || 'その他',
            link.type === 'その他' ? link.type_custom || null : null,
            link.url,
            idx,
          ),
      );
    }
  });

  // 4. Insert skills
  payload.skills.forEach((skill, idx) => {
    if (skill.name) {
      const skillId = `skl_${userId}_${idx}_${Date.now()}`;
      stmts.push(
        db
          .prepare(
            `INSERT INTO skills (id, user_id, category, name, years, level, note)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(user_id, category, name) DO UPDATE SET
               years = excluded.years, level = excluded.level, note = excluded.note`,
          )
          .bind(skillId, userId, skill.category || '開発スキル', skill.name, skill.years, skill.level, skill.note),
      );
    }
  });

  // 5. Insert certifications
  payload.certifications.forEach((cert, idx) => {
    if (cert.name) {
      const certId = `crt_${userId}_${idx}_${Date.now()}`;
      stmts.push(
        db
          .prepare('INSERT INTO certifications (id, user_id, name, acquired_on, sort_order) VALUES (?, ?, ?, ?, ?)')
          .bind(certId, userId, cert.name, cert.date, idx),
      );
    }
  });

  // 6. Insert companies & projects
  payload.companies.forEach((comp, cIdx) => {
    const companyId = `cmp_${userId}_${cIdx}_${Date.now()}`;
    stmts.push(
      db
        .prepare(
          `INSERT INTO companies (
             id, user_id, name, employment_type, employment_type_note, industry, business_summary,
             established, capital, employees, period_from, period_to, is_current, sort_order
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          companyId,
          userId,
          comp.name,
          comp.employment_type || '正社員',
          comp.employment_type_custom || null,
          comp.industry || null,
          comp.business_overview || null,
          comp.established || null,
          comp.capital || null,
          comp.employees || null,
          comp.period_from || null,
          comp.period_to || null,
          comp.is_current ? 1 : 0,
          cIdx,
        ),
    );

    (comp.projects || []).forEach((proj, pIdx) => {
      const projectId = `prj_${userId}_${cIdx}_${pIdx}_${Date.now()}`;
      stmts.push(
        db
          .prepare(
            `INSERT INTO projects (
               id, user_id, company_id, name, role, role_custom, team_size, period_from, period_to,
               is_current, description, responsibilities, achievements, sort_order
             )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            projectId,
            userId,
            companyId,
            proj.name,
            proj.role || null,
            proj.role === 'その他' ? proj.role_custom || null : null,
            proj.team || null,
            proj.period_from || null,
            proj.period_to || null,
            proj.is_current ? 1 : 0,
            proj.description || null,
            proj.processes || null,
            proj.technologies || null,
            pIdx,
          ),
      );
    });
  });

  if (stmts.length > 0) {
    await db.batch(stmts);
  }
}

export async function getCareerStats(db: D1Database, userId: string): Promise<CareerStats> {
  const [companyRes, projectRes, skillRes, certRes, linkRes] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM companies WHERE user_id = ?').bind(userId).first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM projects WHERE user_id = ?').bind(userId).first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM skills WHERE user_id = ?').bind(userId).first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM certifications WHERE user_id = ?').bind(userId).first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM links WHERE user_id = ?').bind(userId).first<{ count: number }>(),
  ]);

  return {
    companyCount: companyRes?.count || 0,
    projectCount: projectRes?.count || 0,
    skillCount: skillRes?.count || 0,
    certificationCount: certRes?.count || 0,
    linkCount: linkRes?.count || 0,
  };
}
