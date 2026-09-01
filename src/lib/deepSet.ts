/** Niezmiennicze ustawienie wartości w zagnieżdżonej strukturze po ścieżce kluczy/indeksów. */
export function deepSet<T>(obj: T, path: (string | number)[], value: unknown): T {
  if (path.length === 0) {
    return value as T;
  }

  const [key, ...rest] = path;

  if (Array.isArray(obj)) {
    const copy = [...obj];
    copy[key as number] = deepSet(copy[key as number], rest, value);
    return copy as T;
  }

  const record = (obj ?? {}) as Record<string, unknown>;
  const copy = { ...record };
  copy[key as string] = deepSet(copy[key as string], rest, value);
  return copy as T;
}
