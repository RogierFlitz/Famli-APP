export function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const item of items) {
    if (!item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
  }
  return unique;
}

export function existingChildRecord<T extends { firstName: string; dateOfBirth: string }>(
  children: T[],
  firstName: string,
  dateOfBirth: string,
): T | undefined {
  const name = firstName.trim().toLowerCase();
  const dob = dateOfBirth.trim();
  if (!name || !dob) return undefined;
  return children.find(
    (child) => child.firstName.trim().toLowerCase() === name && child.dateOfBirth === dob,
  );
}
