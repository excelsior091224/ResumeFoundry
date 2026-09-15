import { clerkClient } from '@clerk/astro/server';
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { deleteUserData } from '../../../features/careers/db';
import { parseRequestBody } from '../../../features/resume/request';

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return origin === new URL(request.url).origin;
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && 'status' in error && error.status === 404;
}

export const DELETE: APIRoute = async (context) => {
  const { request, locals } = context;
  const { isAuthenticated, userId } = locals.auth();

  if (!isAuthenticated) {
    return Response.json({ message: '認証が必要です。' }, { status: 401 });
  }
  if (!isSameOrigin(request)) {
    return Response.json({ message: '不正なリクエストです。' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await parseRequestBody(request);
  } catch {
    return Response.json({ message: 'リクエストを読み取れませんでした。' }, { status: 400 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('confirmation' in body) ||
    body.confirmation !== '退会する'
  ) {
    return Response.json({ message: '確認文字列が一致しません。' }, { status: 422 });
  }

  const db = env.DB;
  if (!db) {
    return Response.json({ message: 'D1 Database binding is not available' }, { status: 500 });
  }

  try {
    await deleteUserData(db, userId);
  } catch (error) {
    console.error('D1 user data deletion failed', error instanceof Error ? error.message : String(error));
    return Response.json({ message: '保存データの削除に失敗しました。時間をおいて再試行してください。' }, { status: 500 });
  }

  try {
    await clerkClient(context).users.deleteUser(userId);
  } catch (error) {
    if (isNotFoundError(error)) {
      return Response.json(
        { success: true },
        {
          headers: {
            'Cache-Control': 'no-store',
            'Clear-Site-Data': '"cookies"',
          },
        },
      );
    }

    console.error('Clerk user deletion failed after D1 data deletion', {
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json(
      {
        message:
          '保存データは削除しましたが、認証アカウントの削除に失敗しました。ページを移動せず、もう一度退会を実行してください。',
      },
      { status: 502 },
    );
  }

  return Response.json(
    { success: true },
    {
      headers: {
        'Cache-Control': 'no-store',
        'Clear-Site-Data': '"cookies"',
      },
    },
  );
};
