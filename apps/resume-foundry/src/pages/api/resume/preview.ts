import type { APIRoute } from 'astro';
import { parseRequestBody } from '../../../features/resume/request';
import { renderResumePreviewHtml } from '../../../features/resume/render';
import { ResumeValidationError, validateResumePayload } from '../../../features/resume/validation';

export const POST: APIRoute = async ({ request }) => {
  try {
    const payload = validateResumePayload(await parseRequestBody(request));

    return new Response(renderResumePreviewHtml(payload), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    if (error instanceof ResumeValidationError) {
      return Response.json({ message: error.message, errors: error.errors }, { status: 422 });
    }

    throw error;
  }
};
