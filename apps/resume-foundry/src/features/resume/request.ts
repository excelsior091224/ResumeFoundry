export async function parseRequestBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return request.json();
  }

  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    return formDataToObject(formData);
  }

  return {};
}

function formDataToObject(formData: FormData): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const [rawKey, rawValue] of formData.entries()) {
    const value = typeof rawValue === 'string' ? rawValue : rawValue.name;
    const path = rawKey.replace(/\]/g, '').split('[').filter(Boolean);
    assignPath(output, path, value);
  }

  return output;
}

function assignPath(target: Record<string, unknown>, path: string[], value: string): void {
  let current: Record<string, unknown> | unknown[] = target;

  path.forEach((segment, index) => {
    const isLast = index === path.length - 1;
    const nextSegment = path[index + 1];
    const nextIsArrayIndex = nextSegment !== undefined && /^\d+$/.test(nextSegment);

    if (Array.isArray(current)) {
      const arrayIndex = Number(segment);
      if (Number.isNaN(arrayIndex)) {
        return;
      }

      if (isLast) {
        current[arrayIndex] = value;
        return;
      }

      current[arrayIndex] ??= nextIsArrayIndex ? [] : {};
      current = current[arrayIndex] as Record<string, unknown> | unknown[];
      return;
    }

    if (isLast) {
      current[segment] = value;
      return;
    }

    current[segment] ??= nextIsArrayIndex ? [] : {};
    current = current[segment] as Record<string, unknown> | unknown[];
  });
}
