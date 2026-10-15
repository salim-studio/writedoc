import { describe, it, expect, beforeEach } from 'vitest';
import { starredPaths, isStarred, toggleStar, moveStar, forgetStar, pruneStars, starredFirst } from '../src/lib/starred.js';

const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };

describe('starred documents', () => {
  beforeEach(() => store.clear());

  it('stars and unstars by path, remembering the order', () => {
    expect(starredPaths()).toEqual([]);
    expect(toggleStar('writedoc/A.docx')).toBe(true);
    expect(toggleStar('writedoc/B.docx')).toBe(true);
    expect(isStarred('writedoc/A.docx')).toBe(true);
    expect(starredPaths()).toEqual(['writedoc/A.docx', 'writedoc/B.docx']);
    expect(toggleStar('writedoc/A.docx')).toBe(false);
    expect(starredPaths()).toEqual(['writedoc/B.docx']);
    expect(toggleStar('')).toBe(false);
    expect(isStarred(null)).toBe(false);
  });

  it('follows a rename and forgets a deletion', () => {
    toggleStar('writedoc/A.docx');
    moveStar('writedoc/A.docx', 'writedoc/Renamed.docx');
    expect(starredPaths()).toEqual(['writedoc/Renamed.docx']);
    moveStar('writedoc/Nope.docx', 'writedoc/X.docx');
    expect(starredPaths()).toEqual(['writedoc/Renamed.docx']);
    forgetStar('writedoc/Renamed.docx');
    expect(starredPaths()).toEqual([]);
  });

  it('prunes stars for missing files and puts starred files first', () => {
    toggleStar('writedoc/B.docx');
    toggleStar('writedoc/Gone.docx');
    const files = [{ path: 'writedoc/A.docx' }, { path: 'writedoc/B.docx' }, { path: 'writedoc/C.docx' }];
    expect(pruneStars(files)).toEqual(['writedoc/B.docx']);
    expect(starredPaths()).toEqual(['writedoc/B.docx']);
    expect(starredFirst(files).map((f) => f.path)).toEqual(['writedoc/B.docx', 'writedoc/A.docx', 'writedoc/C.docx']);
    expect(starredFirst(files, []).map((f) => f.path)).toEqual(['writedoc/A.docx', 'writedoc/B.docx', 'writedoc/C.docx']);
  });

  it('survives corrupt storage', () => {
    store.set('writedoc:starred', '{bad');
    expect(starredPaths()).toEqual([]);
    store.set('writedoc:starred', JSON.stringify([1, null, 'writedoc/A.docx']));
    expect(starredPaths()).toEqual(['writedoc/A.docx']);
  });
});
