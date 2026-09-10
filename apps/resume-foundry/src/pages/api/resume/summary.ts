import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { GeminiConnectionError, GeminiValidationError, summarizeWithGemini } from '../../../features/resume/gemini';
import { parseRequestBody } from '../../../features/resume/request';
import { ResumeValidationError, validateSummaryPayload } from '../../../features/resume/validation';

export const POST: APIRoute = async ({ request }) => {
  try {
    const payload = validateSummaryPayload(await parseRequestBody(request));
    const summary = await summarizeWithGemini(env, payload);

    return Response.json({ summary });
  } catch (error) {
    if (error instanceof ResumeValidationError) {
      return Response.json({ message: error.message, errors: error.errors }, { status: 422 });
    }
    if (error instanceof GeminiConnectionError) {
      return Response.json({ message: error.message }, { status: 503 });
    }
    if (error instanceof GeminiValidationError) {
      return Response.json({ message: error.message }, { status: 422 });
    }

    throw error;
  }
};
