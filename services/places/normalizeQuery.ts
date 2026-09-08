export function normalizeSearchQuery(query: string) {
  return query.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}
