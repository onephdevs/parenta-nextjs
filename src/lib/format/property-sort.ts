/** Natural name compare so "Apartment 1" comes before "Apartment 2" / "APRTMENT-2". */
export function comparePropertyNames(a: string, b: string): number {
  return (a || '').trim().localeCompare((b || '').trim(), undefined, {
    numeric: true,
    sensitivity: 'base',
    ignorePunctuation: true,
  });
}

export function sortPropertiesByName<T extends { name?: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => comparePropertyNames(a.name || '', b.name || ''));
}

export function firstPropertyId<T extends { id: string; name?: string | null }>(
  items: T[]
): string | null {
  return sortPropertiesByName(items)[0]?.id ?? null;
}
