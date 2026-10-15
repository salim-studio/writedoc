import { describe, it, expect } from 'vitest';
import { rememberPosition, recallPosition, forgetPosition, movePosition, MAX_POSITIONS } from '../src/lib/position.js';

const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };

describe('where you left off', () => {
  it('remembers, recalls, and forgets a place per document', () => {
    const storage = memory();
    expect(recallPosition('writedoc/A.docx', { storage })).toBeNull();
    rememberPosition('writedoc/A.docx', { blockId: 'b7', offset: 12 }, { storage, now: 100 });
    expect(recallPosition('writedoc/A.docx', { storage })).toEqual({ blockId: 'b7', offset: 12, at: 100 });
    rememberPosition('writedoc/A.docx', { blockId: 'b9', offset: -3 }, { storage, now: 200 });
    expect(recallPosition('writedoc/A.docx', { storage })).toEqual({ blockId: 'b9', offset: 0, at: 200 });
    forgetPosition('writedoc/A.docx', { storage });
    expect(recallPosition('writedoc/A.docx', { storage })).toBeNull();
  });

  it('ignores useless input and broken storage', () => {
    const storage = memory();
    rememberPosition('', { blockId: 'b1' }, { storage });
    rememberPosition('writedoc/A.docx', {}, { storage });
    expect(storage.m.size).toBe(0);
    storage.setItem('writedoc:positions', '[not json');
    expect(recallPosition('writedoc/A.docx', { storage })).toBeNull();
    rememberPosition('writedoc/A.docx', { blockId: 'b1' }, { storage });
    expect(recallPosition('writedoc/A.docx', { storage }).blockId).toBe('b1');
  });

  it('survives a damaged entry left in storage by something else', () => {
    const storage = memory();
    storage.setItem('writedoc:positions', JSON.stringify({ 'writedoc/old.docx': null, 'writedoc/odd.docx': 'text' }));
    expect(() => rememberPosition('writedoc/a.docx', { blockId: 'p1', offset: 4 }, { storage, now: 5 })).not.toThrow();
    expect(recallPosition('writedoc/a.docx', { storage })).toEqual({ blockId: 'p1', offset: 4, at: 5 });
    expect(recallPosition('writedoc/old.docx', { storage })).toBeNull();
  });

  it('follows renames and trims to the most recent documents', () => {
    const storage = memory();
    rememberPosition('writedoc/Old.docx', { blockId: 'b1', offset: 4 }, { storage, now: 1 });
    movePosition('writedoc/Old.docx', 'writedoc/New.docx', { storage });
    expect(recallPosition('writedoc/Old.docx', { storage })).toBeNull();
    expect(recallPosition('writedoc/New.docx', { storage })).toMatchObject({ blockId: 'b1', offset: 4 });
    for (let i = 0; i < MAX_POSITIONS + 5; i++) rememberPosition(`writedoc/${i}.docx`, { blockId: 'x' }, { storage, now: 10 + i });
    expect(recallPosition('writedoc/New.docx', { storage })).toBeNull();
    expect(recallPosition('writedoc/0.docx', { storage })).toBeNull();
    expect(recallPosition(`writedoc/${MAX_POSITIONS + 4}.docx`, { storage })).not.toBeNull();
    expect(Object.keys(JSON.parse(storage.getItem('writedoc:positions')))).toHaveLength(MAX_POSITIONS);
  });
});
