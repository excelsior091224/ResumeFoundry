import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { ensureClerkUserExists, getCareerData, getCareerStats, saveCareerData } from '../../../features/careers/db';
import { parseRequestBody } from '../../../features/resume/request';
import { ResumeValidationError, validateResumePayload } from '../../../features/resume/validation';

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

export const GET: APIRoute = async ({ locals }) => {
  const { isAuthenticated, userId } = locals.auth();
  if (!isAuthenticated) {
    return Response.json({ message: '認証が必要です。' }, { status: 401 });
  }

  const db = env.DB;
  if (!db) {
    return Response.json({ message: 'D1 Database binding is not available' }, { status: 500 });
  }

  try {
    await ensureClerkUserExists(db, userId);
    const data = await getCareerData(db, userId);
    const stats = await getCareerStats(db, userId);

    return Response.json({ data, stats });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : 'D1からのデータ取得に失敗しました' },
      { status: 500 },
    );
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const { isAuthenticated, userId } = locals.auth();
  if (!isAuthenticated) {
    return Response.json({ message: '認証が必要です。' }, { status: 401 });
  }
  if (!isSameOrigin(request)) {
    return Response.json({ message: '不正なリクエストです。' }, { status: 403 });
  }

  const db = env.DB;
  if (!db) {
    return Response.json({ message: 'D1 Database binding is not available' }, { status: 500 });
  }

  try {
    const raw = await parseRequestBody(request);
    const payload = validateResumePayload(raw);

    await ensureClerkUserExists(db, userId);
    await saveCareerData(db, userId, payload);
    const stats = await getCareerStats(db, userId);

    return Response.json({ success: true, message: '職歴データをD1へ保存しました', data: payload, stats });
  } catch (error) {
    if (error instanceof ResumeValidationError) {
      return Response.json({ message: error.message, errors: error.errors }, { status: 422 });
    }

    return Response.json(
      { message: error instanceof Error ? error.message : 'D1への保存に失敗しました' },
      { status: 500 },
    );
  }
};
