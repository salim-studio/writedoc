import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { saveVersion, listVersions, readVersionMeta, writeVersionMeta, metaPath, MAX_VERSIONS } from '../src/lib/versions.js';
import { installFakeStore } from './helpers/fake-store.js';

describe('version details', () => {
  let store;
  beforeEach(() => { store = installFakeStore(); });
  afterEach(() => { store.restore(); });

  it('keeps who saved a version and its name beside it, and trims both', async () => {
    const v = await saveVersion('writedoc/Plan.docx', new Blob(['x']), { now: Date.UTC(2026, 0, 1), meta: { author: 'ada', label: 'Draft' } });
    expect(await readVersionMeta(v)).toEqual({ author: 'ada', label: 'Draft' });
    await writeVersionMeta(v, { author: 'ada', label: 'Final' });
    expect((await readVersionMeta(v)).label).toBe('Final');
    // Details never count as versions.
    expect((await listVersions('writedoc/Plan.docx')).length).toBe(1);
    for (let i = 1; i <= MAX_VERSIONS; i++) await saveVersion('writedoc/Plan.docx', new Blob(['x']), { now: Date.UTC(2026, 0, 1) + i * 1000, meta: { author: 'bob' } });
    expect(store.files.has(v.path)).toBe(false);
    expect(store.files.has(metaPath(v.path))).toBe(false);
    expect(await readVersionMeta({ path: 'writedoc/.versions/Plan/missing.docx' })).toEqual({});
  });
});
