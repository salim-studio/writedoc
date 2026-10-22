import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../src/lib/drive.js', async (importOriginal) => (await import('./helpers/drive-mock.js')).makeDriveMock(await importOriginal()));

import * as D from '../src/lib/drive.js';
import { versionsFolder, versionName, parseVersionTime, shouldSnapshot, listVersions, saveVersion, snapshotIfDue, renameVersions, deleteVersions, VERSION_INTERVAL_MS, MAX_VERSIONS } from '../src/lib/versions.js';

describe('version naming', () => {
  it('maps document paths to a snapshot folder inside the app folder only', () => {
    expect(versionsFolder('writedoc/Report.docx')).toBe('writedoc/.versions/Report');
    expect(versionsFolder('writedoc/Q1.final.docx')).toBe('writedoc/.versions/Q1.final');
    expect(versionsFolder('Desktop/Report.docx')).toBeNull();
    expect(versionsFolder('writedoc/sub/Report.docx')).toBeNull();
    expect(versionsFolder(null)).toBeNull();
  });

  it.each(['.docx', '..docx', '...docx'])('never maps %s to the history root or its parent', (name) => {
    expect(versionsFolder(`writedoc/${name}`)).toBeNull();
  });

  it.each(['Report.hwp', 'Report.hwpx', 'Report.dotx', 'Report.docm'])('does not give %s the history of Report.docx', (name) => {
    expect(versionsFolder(`writedoc/${name}`)).toBeNull();
  });

  it('round-trips snapshot times through file names', () => {
    const t = Date.UTC(2026, 7, 28, 9, 15, 30, 123);
    expect(versionName(t)).toBe('2026-08-28T09-15-30-123Z.docx');
    expect(parseVersionTime(versionName(t))).toBe(t);
    expect(parseVersionTime('notes.docx')).toBeNull();
    expect(parseVersionTime('')).toBeNull();
  });

  it('snapshots when none exists or the last is old enough', () => {
    expect(shouldSnapshot(null, 1000)).toBe(true);
    expect(shouldSnapshot(0, VERSION_INTERVAL_MS - 1)).toBe(false);
    expect(shouldSnapshot(0, VERSION_INTERVAL_MS)).toBe(true);
    expect(shouldSnapshot(500, 800, 300)).toBe(true);
  });
});

describe('snapshots', () => {
  beforeEach(() => { D.__fs.clear(); D.__meta.clear(); D.__reset(); });
  afterEach(() => { vi.restoreAllMocks(); });
  const blob = (s) => new Blob([s]);
  const T0 = Date.UTC(2026, 7, 28, 9, 0, 0, 0);

  it('lists nothing for a fresh document and newest first once saved', async () => {
    expect(await listVersions('writedoc/A.docx')).toEqual([]);
    await saveVersion('writedoc/A.docx', blob('one'), { now: T0 });
    await saveVersion('writedoc/A.docx', blob('two!'), { now: T0 + 60000 });
    const list = await listVersions('writedoc/A.docx');
    expect(list.map((v) => v.time)).toEqual([T0 + 60000, T0]);
    expect(list[0].path).toBe(`writedoc/.versions/A/${versionName(T0 + 60000)}`);
    expect(list[0].size).toBe(4);
    expect(await saveVersion('Desktop/x.docx', blob('x'))).toBeNull();
  });

  it('trims the oldest beyond the cap', async () => {
    for (let i = 0; i < MAX_VERSIONS + 3; i++) await saveVersion('writedoc/A.docx', blob(String(i)), { now: T0 + i * 1000, keep: MAX_VERSIONS });
    const list = await listVersions('writedoc/A.docx');
    expect(list).toHaveLength(MAX_VERSIONS);
    expect(list.at(-1).time).toBe(T0 + 3000);
  });

  it('preserves concurrent snapshots taken in the same millisecond and lists the newest first', async () => {
    const versions = await Promise.all(Array.from({ length: 12 }, (_, i) =>
      saveVersion('writedoc/A.docx', blob(`revision ${i}`), { now: T0 })));
    expect(new Set(versions.map((v) => v.path)).size).toBe(12);
    for (const [i, version] of versions.entries()) {
      expect(await D.__fs.get(version.path).text()).toBe(`revision ${i}`);
    }
    const list = await listVersions('writedoc/A.docx');
    expect(list.map((v) => v.path)).toEqual(versions.map((v) => v.path).reverse());
    expect(list.map((v) => v.time)).toEqual(Array.from({ length: 12 }, (_, i) => T0 + 11 - i));
  });

  it('trims older same-time snapshots without overwriting their newer replacements', async () => {
    const versions = [];
    for (let i = 0; i < 8; i++) versions.push(await saveVersion('writedoc/A.docx', blob(`revision ${i}`), { now: T0, keep: 3 }));
    expect((await listVersions('writedoc/A.docx')).map((v) => v.path)).toEqual(versions.slice(-3).map((v) => v.path).reverse());
    expect(await D.__fs.get(versions.at(-1).path).text()).toBe('revision 7');
  });

  it('reports write failures without discarding an existing snapshot', async () => {
    const first = await saveVersion('writedoc/A.docx', blob('keep'), { now: T0 });
    D.writeFile.mockClear();
    D.writeFile.mockRejectedValue(new Error('Permission denied'));
    await expect(saveVersion('writedoc/A.docx', blob('new'), { now: T0 })).rejects.toThrow('Permission denied');
    expect(D.writeFile).toHaveBeenCalledOnce();
    expect(await D.__fs.get(first.path).text()).toBe('keep');
  });

  it('snapshots after a save only when due, reading the folder once', async () => {
    let last = await snapshotIfDue('writedoc/A.docx', blob('v1'), undefined, { now: T0 });
    expect(last).toBe(T0);
    last = await snapshotIfDue('writedoc/A.docx', blob('v2'), last, { now: T0 + 1000 });
    expect(last).toBe(T0);
    last = await snapshotIfDue('writedoc/A.docx', blob('v3'), last, { now: T0 + VERSION_INTERVAL_MS });
    expect(last).toBe(T0 + VERSION_INTERVAL_MS);
    expect((await listVersions('writedoc/A.docx')).map((v) => v.time)).toEqual([T0 + VERSION_INTERVAL_MS, T0]);
    // An existing history is picked up when the last time is unknown.
    expect(await snapshotIfDue('writedoc/A.docx', blob('v4'), undefined, { now: T0 + VERSION_INTERVAL_MS + 5 })).toBe(T0 + VERSION_INTERVAL_MS);
    expect(await snapshotIfDue('Desktop/x.docx', blob('x'), undefined, { now: T0 })).toBeNull();
  });

  it('follows a rename and goes with a delete', async () => {
    await saveVersion('writedoc/A.docx', blob('one'), { now: T0 });
    await renameVersions('writedoc/A.docx', 'writedoc/B.docx');
    expect(await listVersions('writedoc/A.docx')).toEqual([]);
    expect((await listVersions('writedoc/B.docx')).map((v) => v.time)).toEqual([T0]);
    await renameVersions('writedoc/Nope.docx', 'writedoc/C.docx');
    await deleteVersions('writedoc/B.docx');
    expect(await listVersions('writedoc/B.docx')).toEqual([]);
    expect([...D.__fs.keys()].some((k) => k.startsWith('writedoc/.versions/B/'))).toBe(false);
  });

  it('replaces a history left behind at the new name instead of adopting it', async () => {
    // B was deleted outside the app, leaving its snapshots; A is renamed to B.
    await saveVersion('writedoc/B.docx', blob('stale'), { now: T0 - 1000 });
    await saveVersion('writedoc/A.docx', blob('mine'), { now: T0 });
    await renameVersions('writedoc/A.docx', 'writedoc/B.docx');
    expect((await listVersions('writedoc/B.docx')).map((v) => v.time)).toEqual([T0]);
    expect(await listVersions('writedoc/A.docx')).toEqual([]);
  });

  it('replaces an empty folder left behind at the new name', async () => {
    // B's snapshots were removed one by one, leaving its empty folder; A is renamed to B.
    await saveVersion('writedoc/B.docx', blob('stale'), { now: T0 - 1000 });
    for (const key of [...D.__fs.keys()]) if (key.startsWith('writedoc/.versions/B/')) D.__fs.delete(key);
    await saveVersion('writedoc/A.docx', blob('mine'), { now: T0 });
    await renameVersions('writedoc/A.docx', 'writedoc/B.docx');
    expect((await listVersions('writedoc/B.docx')).map((v) => v.time)).toEqual([T0]);
    expect(await listVersions('writedoc/A.docx')).toEqual([]);
  });

  it('does not delete or move unrelated history for dot-only names or non-DOCX sources', async () => {
    await saveVersion('writedoc/Report.docx', blob('saved work'), { now: T0 });
    const remove = vi.spyOn(D, 'deleteFile');
    const rename = vi.spyOn(D, 'renameFile');
    for (const name of ['.docx', '..docx', '...docx', 'Report.hwp']) {
      await deleteVersions(`writedoc/${name}`);
      await renameVersions(`writedoc/${name}`, 'writedoc/Other.docx');
      await renameVersions('writedoc/Report.docx', `writedoc/${name}`);
      expect(await saveVersion(`writedoc/${name}`, blob('other work'))).toBeNull();
    }
    expect(remove).not.toHaveBeenCalled();
    expect(rename).not.toHaveBeenCalled();
    expect((await listVersions('writedoc/Report.docx')).map((v) => v.time)).toEqual([T0]);
  });
});
