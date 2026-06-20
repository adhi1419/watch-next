import { describe, it, expect } from 'vitest';

/**
 * Watch Next deduplication logic:
 * Recommendations displayed in the grid should exclude any title whose ID
 * appears in currentlyWatching, completed, or stopped lists.
 */

type Title = { id: string; title: string; objectType: string };

// The dedup filter function that DiscoverView will use
function filterWatchNextRecommendations(
  titles: Title[],
  currentlyWatchingIds: Set<string>,
  completedIds: Set<string>,
  stoppedIds: Set<string>,
): Title[] {
  const excludeIds = new Set([...currentlyWatchingIds, ...completedIds, ...stoppedIds]);
  return titles.filter(t => !excludeIds.has(t.id));
}

describe('Watch Next deduplication', () => {
  const recs: Title[] = [
    { id: 'ts1', title: 'Breaking Bad', objectType: 'SHOW' },
    { id: 'ts2', title: 'The Office', objectType: 'SHOW' },
    { id: 'ts3', title: 'Stranger Things', objectType: 'SHOW' },
    { id: 'tm1', title: 'Inception', objectType: 'MOVIE' },
    { id: 'tm2', title: 'Interstellar', objectType: 'MOVIE' },
  ];

  it('excludes titles in currentlyWatching', () => {
    const currentlyWatching = new Set(['ts1', 'ts3']);
    const result = filterWatchNextRecommendations(recs, currentlyWatching, new Set(), new Set());
    expect(result.map(t => t.id)).toEqual(['ts2', 'tm1', 'tm2']);
  });

  it('excludes titles that are completed', () => {
    const completed = new Set(['ts2', 'tm1']);
    const result = filterWatchNextRecommendations(recs, new Set(), completed, new Set());
    expect(result.map(t => t.id)).toEqual(['ts1', 'ts3', 'tm2']);
  });

  it('excludes titles that are stopped', () => {
    const stopped = new Set(['tm2']);
    const result = filterWatchNextRecommendations(recs, new Set(), new Set(), stopped);
    expect(result.map(t => t.id)).toEqual(['ts1', 'ts2', 'ts3', 'tm1']);
  });

  it('excludes titles from all three lists combined', () => {
    const currentlyWatching = new Set(['ts1']);
    const completed = new Set(['ts3']);
    const stopped = new Set(['tm2']);
    const result = filterWatchNextRecommendations(recs, currentlyWatching, completed, stopped);
    expect(result.map(t => t.id)).toEqual(['ts2', 'tm1']);
  });

  it('returns all titles when no exclusion sets have matches', () => {
    const result = filterWatchNextRecommendations(recs, new Set(['unknown']), new Set(), new Set());
    expect(result).toEqual(recs);
  });

  it('returns empty array when all titles are excluded', () => {
    const all = new Set(['ts1', 'ts2', 'ts3', 'tm1', 'tm2']);
    const result = filterWatchNextRecommendations(recs, all, new Set(), new Set());
    expect(result).toEqual([]);
  });
});
