import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont } from 'pdf-lib';
import { displayCompanyName, displayLinkType, displayRole, formatMonth } from './render';
import type { ResumeCompany, ResumePayload, ResumeProject, ResumeSkill } from './types';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 36;
const MARGIN_TOP = 42;
const MARGIN_BOTTOM = 42;
const BRAND = rgb(0.125, 0.145, 0.165);
const LIGHT = rgb(0.91, 0.91, 0.90);
const SUBTLE = rgb(0.68, 0.71, 0.70);

function splitParagraphs(text: string): string[] {
  return text.split(/\r\n|\r|\n/);
}

function wrapLine(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  if (!text) {
    return [''];
  }

  const result: string[] = [];
  let current = '';

  for (const char of [...text]) {
    const next = `${current}${char}`;
    if (font.widthOfTextAtSize(next, size) <= maxWidth || current === '') {
      current = next;
      continue;
    }

    result.push(current);
    current = char;
  }

  if (current) {
    result.push(current);
  }

  return result;
}

function wrapText(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  return splitParagraphs(text).flatMap((line) => wrapLine(font, line, size, maxWidth));
}

function createPageState(pdf: PDFDocument) {
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN_TOP;

  const ensureSpace = (height: number) => {
    if (y - height < MARGIN_BOTTOM) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN_TOP;
    }
  };

  const drawTextBlock = (
    font: PDFFont,
    text: string,
    x: number,
    width: number,
    size = 10,
    lineHeight = size * 1.55,
    color = BRAND,
  ) => {
    const lines = wrapText(font, text, size, width);
    ensureSpace(lines.length * lineHeight + 4);

    for (const line of lines) {
      page.drawText(line || ' ', { x, y: y - size, size, font, color });
      y -= lineHeight;
    }
  };

  return {
    get page() {
      return page;
    },
    get y() {
      return y;
    },
    set y(value: number) {
      y = value;
    },
    ensureSpace,
    drawTextBlock,
  };
}

function drawHeader(state: ReturnType<typeof createPageState>, font: PDFFont, resume: ResumePayload): void {
  state.ensureSpace(44);
  state.page.drawText('職務経歴書', { x: MARGIN_X, y: state.y - 20, size: 19, font, color: BRAND });

  const metaLines = [`${resume.as_of_date}`, `氏名：${resume.full_name}`];
  const size = 9.5;
  const lineHeight = 14;
  let metaY = state.y - 4;

  for (const line of metaLines) {
    const width = font.widthOfTextAtSize(line, size);
    state.page.drawText(line, {
      x: PAGE_WIDTH - MARGIN_X - width,
      y: metaY - size,
      size,
      font,
      color: BRAND,
    });
    metaY -= lineHeight;
  }

  state.y -= 32;
  state.page.drawLine({
    start: { x: MARGIN_X, y: state.y },
    end: { x: PAGE_WIDTH - MARGIN_X, y: state.y },
    thickness: 1.5,
    color: BRAND,
  });
  state.y -= 14;
}

function drawSectionHeading(state: ReturnType<typeof createPageState>, font: PDFFont, title: string): void {
  state.ensureSpace(24);
  state.page.drawText(`■ ${title}`, { x: MARGIN_X, y: state.y - 11, size: 10.5, font, color: BRAND });
  state.y -= 16;
  state.page.drawLine({
    start: { x: MARGIN_X, y: state.y },
    end: { x: PAGE_WIDTH - MARGIN_X, y: state.y },
    thickness: 1,
    color: BRAND,
  });
  state.y -= 8;
}

function drawList(state: ReturnType<typeof createPageState>, font: PDFFont, items: string[]): void {
  if (!items.length) {
    state.drawTextBlock(font, '入力してください', MARGIN_X, PAGE_WIDTH - MARGIN_X * 2, 9.5, 14.2, SUBTLE);
    return;
  }

  for (const item of items) {
    state.drawTextBlock(font, `・ ${item}`, MARGIN_X, PAGE_WIDTH - MARGIN_X * 2, 9.5);
  }
}

function cellLines(font: PDFFont, text: string, size: number, width: number): string[] {
  return wrapText(font, text, size, width - 8);
}

function drawSkillsTable(
  state: ReturnType<typeof createPageState>,
  font: PDFFont,
  skills: ResumeSkill[],
): void {
  const tableWidth = PAGE_WIDTH - MARGIN_X * 2;
  const columns = [0.17, 0.18, 0.1, 0.15, 0.4].map((ratio) => ratio * tableWidth);
  const headers = ['カテゴリ', 'スキル', '経験年数', '経験区分', '備考'];

  const drawRow = (values: string[], isHeader = false, singleCell = false) => {
    const fontSize = isHeader ? 8.2 : 8;
    const cellPadding = 4;
    const lineHeight = 11;
    const lineGroups = singleCell
      ? [cellLines(font, values[0], fontSize, tableWidth)]
      : values.map((value, index) => cellLines(font, value, fontSize, columns[index]));
    const rowHeight = Math.max(...lineGroups.map((lines) => Math.max(lines.length, 1))) * lineHeight + cellPadding * 2;

    state.ensureSpace(rowHeight + 2);
    const topY = state.y;

    if (singleCell) {
      state.page.drawRectangle({
        x: MARGIN_X,
        y: topY - rowHeight,
        width: tableWidth,
        height: rowHeight,
        borderColor: BRAND,
        borderWidth: 0.5,
      });
      lineGroups[0].forEach((line, lineIndex) => {
        state.page.drawText(line, {
          x: MARGIN_X + cellPadding,
          y: topY - cellPadding - fontSize - lineIndex * lineHeight,
          size: fontSize,
          font,
          color: SUBTLE,
        });
      });
      state.y -= rowHeight;
      return;
    }

    let x = MARGIN_X;
    columns.forEach((width, index) => {
      state.page.drawRectangle({
        x,
        y: topY - rowHeight,
        width,
        height: rowHeight,
        borderColor: BRAND,
        borderWidth: 0.5,
        color: isHeader ? LIGHT : undefined,
      });
      lineGroups[index].forEach((line, lineIndex) => {
        state.page.drawText(line, {
          x: x + cellPadding,
          y: topY - cellPadding - fontSize - lineIndex * lineHeight,
          size: fontSize,
          font,
          color: BRAND,
        });
      });
      x += width;
    });

    state.y -= rowHeight;
  };

  drawRow(headers, true);
  if (!skills.length) {
    drawRow(['スキルを入力してください'], false, true);
  } else {
    skills.forEach((skill) => drawRow([skill.category || '未分類', skill.name, skill.years, skill.level, skill.note]));
  }
  state.y -= 6;
}

function companyMeta(company: ResumeCompany): string {
  return [
    company.employment_type === 'その他' ? company.employment_type_custom : company.employment_type,
    company.industry,
    company.established ? `設立：${company.established}` : '',
    company.capital ? `資本金：${company.capital}` : '',
    company.employees ? `従業員数：${company.employees}` : '',
  ]
    .filter(Boolean)
    .join(' / ');
}

function drawProjects(
  state: ReturnType<typeof createPageState>,
  font: PDFFont,
  projects: ResumeProject[],
): void {
  for (const project of projects) {
    if (
      !project.name &&
      !project.description &&
      !project.processes &&
      !project.technologies &&
      !project.role &&
      !project.team
    ) {
      continue;
    }

    const projectPeriod = [project.period_from, project.period_to].filter(Boolean).join('〜');
    const periodText = projectPeriod ? `（${projectPeriod}）` : '';
    const title = project.name ? `■ ${project.name}${periodText}` : periodText ? `■ ${periodText}` : '';

    if (title) {
      state.ensureSpace(28);
      state.page.drawText(title, {
        x: MARGIN_X + 6,
        y: state.y - 10,
        size: 9.5,
        font,
        color: BRAND,
      });
      state.y -= 16;
    }

    if (project.description) {
      state.drawTextBlock(font, project.description, MARGIN_X + 6, PAGE_WIDTH - MARGIN_X * 2 - 6, 8, 11.6);
    }
    if (project.processes) {
      state.drawTextBlock(font, `【担当工程】\n${project.processes}`, MARGIN_X + 6, PAGE_WIDTH - MARGIN_X * 2 - 6, 8, 11.6);
    }
    if (project.technologies) {
      state.drawTextBlock(
        font,
        `【使用技術・DB・OS】\n${project.technologies}`,
        MARGIN_X + 6,
        PAGE_WIDTH - MARGIN_X * 2 - 6,
        8,
        11.6,
      );
    }
    const roleTeam = [displayRole(project), project.team].filter(Boolean).join(' / ');
    if (roleTeam) {
      state.drawTextBlock(font, `【組織・役割】\n${roleTeam}`, MARGIN_X + 6, PAGE_WIDTH - MARGIN_X * 2 - 6, 8, 11.6);
    }

    state.page.drawLine({
      start: { x: MARGIN_X + 6, y: state.y },
      end: { x: PAGE_WIDTH - MARGIN_X, y: state.y },
      thickness: 0.5,
      color: SUBTLE,
    });
    state.y -= 8;
  }
}

function drawCompanies(
  state: ReturnType<typeof createPageState>,
  font: PDFFont,
  companies: ResumeCompany[],
): void {
  if (!companies.length) {
    state.drawTextBlock(font, '所属企業とプロジェクトを入力してください', MARGIN_X, PAGE_WIDTH - MARGIN_X * 2, 9.5);
    return;
  }

  for (const company of companies) {
    state.ensureSpace(24);
    state.page.drawText(
      `勤務先：${displayCompanyName(company)}（${[company.period_from, company.period_to].filter(Boolean).join('〜')}）`,
      {
        x: MARGIN_X,
        y: state.y - 10,
        size: 9.5,
        font,
        color: BRAND,
      },
    );
    state.y -= 14;
    state.page.drawLine({
      start: { x: MARGIN_X, y: state.y },
      end: { x: PAGE_WIDTH - MARGIN_X, y: state.y },
      thickness: 0.7,
      color: BRAND,
    });
    state.y -= 8;

    const meta = companyMeta(company);
    if (meta) {
      state.drawTextBlock(font, meta, MARGIN_X, PAGE_WIDTH - MARGIN_X * 2, 8, 11.6);
    }
    if (company.business_overview) {
      state.drawTextBlock(font, `【業務概要】\n${company.business_overview}`, MARGIN_X, PAGE_WIDTH - MARGIN_X * 2, 8, 11.6);
    }

    drawProjects(state, font, company.projects);
    state.y -= 2;
  }
}

async function fetchFontBytes(origin: string, env: Env): Promise<Uint8Array> {
  const assetUrl = new URL('/fonts/IPAexGothic.ttf', origin).toString();
  const response = env.ASSETS
    ? await env.ASSETS.fetch(new Request(assetUrl))
    : await fetch(assetUrl);

  if (!response.ok) {
    throw new Error('IPAexGothic.ttf を取得できませんでした。');
  }

  return new Uint8Array(await response.arrayBuffer());
}

export async function generateResumePdf(
  resume: ResumePayload,
  origin: string,
  env: Env,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fontBytes = await fetchFontBytes(origin, env);
  const font = await pdf.embedFont(fontBytes, { subset: true });

  pdf.setTitle('職務経歴書');
  pdf.setProducer('Resume Foundry');
  pdf.setCreator('Resume Foundry');
  pdf.setLanguage('ja-JP');

  const state = createPageState(pdf);
  drawHeader(state, font, resume);

  drawSectionHeading(state, font, '職務要約');
  state.drawTextBlock(font, resume.summary, MARGIN_X, PAGE_WIDTH - MARGIN_X * 2, 9, 14.8);

  drawSectionHeading(state, font, '得意業務');
  state.drawTextBlock(font, `・ ${resume.specialty}`, MARGIN_X, PAGE_WIDTH - MARGIN_X * 2, 9.5);

  drawSectionHeading(state, font, '技術系アカウント・ポートフォリオ');
  drawList(
    state,
    font,
    resume.links.filter((link) => link.url).map((link) => `${displayLinkType(link)}：${link.url}`),
  );

  drawSectionHeading(state, font, 'PCスキル / テクニカルスキル');
  drawSkillsTable(state, font, resume.skills);

  drawSectionHeading(state, font, '職務経歴');
  drawCompanies(state, font, resume.companies);

  drawSectionHeading(state, font, '資格');
  drawList(
    state,
    font,
    resume.certifications
      .filter((item) => item.name)
      .map((item) => `${formatMonth(item.date)}　${item.name}`),
  );

  drawSectionHeading(state, font, '自己PR');
  state.drawTextBlock(font, resume.self_pr, MARGIN_X, PAGE_WIDTH - MARGIN_X * 2, 9.5);

  if (resume.considerations) {
    drawSectionHeading(state, font, '配慮事項');
    state.drawTextBlock(font, resume.considerations, MARGIN_X, PAGE_WIDTH - MARGIN_X * 2, 9.5);
  }

  state.ensureSpace(32);
  const rightText = '以上';
  state.page.drawText(rightText, {
    x: PAGE_WIDTH - MARGIN_X - font.widthOfTextAtSize(rightText, 9.5),
    y: state.y - 10,
    size: 9.5,
    font,
    color: BRAND,
  });
  state.y -= 18;

  const closing = '是非、面接の機会をいただければと思います。何卒よろしくお願いいたします。';
  const closingWidth = font.widthOfTextAtSize(closing, 9.5);
  state.page.drawText(closing, {
    x: (PAGE_WIDTH - closingWidth) / 2,
    y: state.y - 10,
    size: 9.5,
    font,
    color: BRAND,
  });

  return pdf.save();
}
