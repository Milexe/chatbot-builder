export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return base || "bot";
}

export function uniqueSlug(base: string, existing: string[]): string {
  const set = new Set(existing);
  if (!set.has(base)) return base;

  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${base}-${i}`.slice(0, 60);
    if (!set.has(candidate)) return candidate;
  }

  return `${base}-${Date.now()}`;
}
