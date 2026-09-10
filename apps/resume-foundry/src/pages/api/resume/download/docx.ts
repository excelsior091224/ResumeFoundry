import type { APIRoute } from 'astro';
import { generateResumeDocx } from '../../../../features/resume/docx';
import { parseRequestBody } from '../../../../features/resume/request';
import { ResumeValidationError, validateResumePayload } from '../../../../features/resume/validation';

export const POST: APIRoute = async ({ request }) => {
  try {
    const resume = validateResumePayload(await parseRequestBody(request));
    const bytes = await generateResumeDocx(resume);
    const filename = `resume-${timestampForFilename(new Date())}.docx`;

    return new Response(bytes, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof ResumeValidationError) {
      return Response.json({ message: error.message, errors: error.errors }, { status: 422 });
    }

    throw error;
  }
};

function timestampForFilename(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}
