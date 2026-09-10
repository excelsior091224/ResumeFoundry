import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { displayCompanyName, displayLinkType, displayRole, formatMonth } from './render';
import type { ResumeCompany, ResumePayload, ResumeProject } from './types';

function textRunsFromMultiline(
  text: string,
  fontStyle: Record<string, unknown> = {},
): TextRun[] {
  const lines = text.split(/\r\n|\r|\n/);

  return lines.flatMap((line, index) => {
    const run = new TextRun({
      text: line,
      font: 'IPAexGothic',
      color: '20252A',
      ...(fontStyle as object),
    });
    return index === 0 ? [run] : [new TextRun({ break: 1 }), run];
  });
}

function paragraph(text: string, options: Record<string, unknown> = {}): Paragraph {
  return new Paragraph({
    children: textRunsFromMultiline(text),
    ...(options as object),
  });
}

function heading(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 24, font: 'IPAexGothic', color: '20252A' })],
    spacing: { before: 180, after: 80 },
    border: {
      bottom: {
        color: '20252A',
        style: BorderStyle.SINGLE,
        size: 8,
      },
    },
    keepNext: true,
  });
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

function projectParagraphs(project: ResumeProject): Paragraph[] {
  const role = displayRole(project);

  return [
    new Paragraph({
      children: [
        new TextRun({
          text: `■ ${project.name}（${[project.period_from, project.period_to].filter(Boolean).join('〜')}）`,
          bold: true,
          font: 'IPAexGothic',
          color: '20252A',
        }),
      ],
      spacing: { before: 70, after: 40 },
      indent: { left: 180 },
    }),
    paragraph(project.description, { spacing: { after: 40 }, indent: { left: 180 } }),
    paragraph(`【担当工程】\n${project.processes}`, { spacing: { after: 30 }, indent: { left: 180 } }),
    paragraph(`【使用技術・DB・OS】\n${project.technologies}`, {
      spacing: { after: 30 },
      indent: { left: 180 },
    }),
    paragraph(`【組織・役割】\n${role} / ${project.team}`, {
      spacing: { after: 70 },
      indent: { left: 180 },
    }),
  ];
}

export async function generateResumeDocx(resume: ResumePayload): Promise<ArrayBuffer> {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 900, right: 900, bottom: 900, left: 900 },
            size: { width: 11906, height: 16838 },
          },
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: '職務経歴書', bold: true, size: 40, font: 'IPAexGothic', color: '20252A' }),
            ],
            spacing: { after: 160 },
            border: {
              bottom: { color: '176B6B', style: BorderStyle.SINGLE, size: 18 },
            },
          }),
          paragraph(`${resume.as_of_date}\n氏名：${resume.full_name}`, {
            alignment: AlignmentType.RIGHT,
            spacing: { after: 120 },
          }),
          heading('職務要約'),
          paragraph(resume.summary, { spacing: { after: 100 } }),
          heading('得意業務'),
          paragraph(resume.specialty, { spacing: { after: 100 } }),
          heading('技術系アカウント・ポートフォリオ'),
          ...resume.links
            .filter((link) => link.url)
            .map((link) => paragraph(`${displayLinkType(link)}：${link.url}`, { spacing: { after: 50 } })),
          heading('PCスキル / テクニカルスキル'),
          new Table({
            layout: TableLayoutType.FIXED,
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: ['カテゴリ', 'スキル', '経験年数', '経験区分', '備考'].map(
                  (label, index) =>
                    new TableCell({
                      width: { size: [1700, 2200, 1400, 1500, 2400][index], type: WidthType.DXA },
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: label, bold: true, font: 'IPAexGothic' })],
                        }),
                      ],
                    }),
                ),
              }),
              ...resume.skills.map(
                (skill) =>
                  new TableRow({
                    children: [skill.category, skill.name, skill.years, skill.level, skill.note].map(
                      (value, index) =>
                        new TableCell({
                          width: { size: [1700, 2200, 1400, 1500, 2400][index], type: WidthType.DXA },
                          children: [paragraph(value)],
                        }),
                    ),
                  }),
              ),
            ],
          }),
          heading('職務経歴'),
          ...resume.companies.flatMap((company) => {
            const meta = companyMeta(company);

            return [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${displayCompanyName(company)}（${[company.period_from, company.period_to]
                      .filter(Boolean)
                      .join('〜')}）`,
                    bold: true,
                    size: 22,
                    font: 'IPAexGothic',
                    color: '20252A',
                  }),
                ],
                spacing: { before: 100, after: 70 },
                border: { bottom: { color: 'B8C2C8', style: BorderStyle.SINGLE, size: 6 } },
              }),
              ...(meta
                ? [
                    new Paragraph({
                      children: [new TextRun({ text: meta, size: 18, font: 'IPAexGothic', color: '20252A' })],
                      spacing: { after: 40 },
                    }),
                  ]
                : []),
              ...(company.business_overview
                ? [paragraph(`【業務概要】\n${company.business_overview}`, { spacing: { after: 50 } })]
                : []),
              ...company.projects.flatMap(projectParagraphs),
            ];
          }),
          heading('資格'),
          ...resume.certifications
            .filter((certification) => certification.name)
            .map((certification) => paragraph(`${formatMonth(certification.date)}　${certification.name}`)),
          heading('自己PR'),
          paragraph(resume.self_pr),
          ...(resume.considerations ? [heading('配慮事項'), paragraph(resume.considerations)] : []),
          paragraph('以上', { alignment: AlignmentType.RIGHT, spacing: { before: 180 } }),
          paragraph('是非、面接の機会をいただければと思います。何卒よろしくお願いいたします。', {
            alignment: AlignmentType.CENTER,
          }),
        ],
      },
    ],
  });

  return Packer.toArrayBuffer(doc);
}
