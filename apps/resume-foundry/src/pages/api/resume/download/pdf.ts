import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { generateResumePdf } from '../../../../features/resume/pdf';
import { parseRequestBody } from '../../../../features/resume/request';
import { ResumeValidationError, validateResumePayload } from '../../../../features/resume/validation';

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const resume = validateResumePayload(await parseRequestBody(request));
    const bytes = await generateResumePdf(resume, url.origin, env);
    const filename = `resume-${timestampForFilename(new Date())}.pdf`;

    return new Response(bytes.slice().buffer, {
      headers: {
        'Content-Type': 'application/pdf',
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
