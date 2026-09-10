import type { ResumeSummaryPayload } from './types';

export class GeminiConnectionError extends Error {
  public readonly status = 503;

  constructor(message = 'AI要約サービスに接続できませんでした。時間をおいて再試行してください。') {
    super(message);
    this.name = 'GeminiConnectionError';
  }
}

export class GeminiValidationError extends Error {
  public readonly status = 422;

  constructor(message: string) {
    super(message);
    this.name = 'GeminiValidationError';
  }
}

function buildPrompt(careerJson: string): string {
  return `以下の職歴、スキル、資格だけを根拠に、職務経歴書向けの職務要約を日本語で作成してください。

- 事実にない経験、成果、数値、役割、技術を追加しない
- 誇張や推測をしない
- 250文字以内、2から4文で簡潔にまとめる
- 氏名、連絡先、URLなどの個人情報には触れない
- 要約本文だけを返し、見出しや箇条書き、前置きは付けない

職歴情報:
${careerJson}`;
}

export async function summarizeWithGemini(env: Env, payload: ResumeSummaryPayload): Promise<string> {
  const apiKey = env.GEMINI_API_KEY;
  const model = env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

  if (!apiKey) {
    throw new GeminiConnectionError();
  }

  const careerJson = JSON.stringify({
    companies: payload.companies,
    skills: payload.skills,
    certifications: payload.certifications,
  });

  let response: Response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: buildPrompt(careerJson),
              },
            ],
          },
        ],
      }),
    });
  } catch {
    throw new GeminiConnectionError();
  }

  if (!response.ok) {
    throw new GeminiConnectionError();
  }

  const body = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const summary = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

  if (!summary) {
    throw new GeminiValidationError('AIから職務要約を取得できませんでした。');
  }

  return summary;
}
