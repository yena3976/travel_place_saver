import type { RegionSummary } from './types.ts';

export type DestinationGroupRow = {
  destination?: string | null;
  country?: string | null;
  thumbnailUrl?: string | null;
};

export function groupDestinations(rows: DestinationGroupRow[]): RegionSummary[] {
  const grouped = new Map<string, RegionSummary>();
  for (const row of rows) {
    const destination = row.destination ?? 'Unknown';
    const country = row.country ?? 'Unknown';
    const groupKey = `${country}\u0000${destination}`;
    const current = grouped.get(groupKey);
    if (current) current.count += 1;
    else {
      grouped.set(groupKey, {
        destination,
        country,
        count: 1,
        thumbnailUrl: row.thumbnailUrl ?? null,
      });
    }
  }
  return [...grouped.values()].sort((a, b) =>
    a.destination.localeCompare(b.destination),
  );
}
