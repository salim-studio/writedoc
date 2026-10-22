import { afterEach, beforeEach, expect, it, vi } from 'vitest';

vi.mock('../src/lib/drive.js', async (importOriginal) => (await import('./helpers/drive-mock.js')).makeDriveMock(await importOriginal()));

import { Doc, versioning } from '../src/lib/doc.js';
import * as D from '../src/lib/drive.js';

let path, docs, stamp;

beforeEach(() => {
  vi.useFakeTimers();
  path = 'writedoc/Report.docx';
  docs = []; stamp = 100;
  versioning.enabled = false;
  D.__fs.clear(); D.__meta.clear(); D.__reset();
  D.__fs.set(path, new Blob(['original'])); D.__meta.set(path, ++stamp);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('navigator', { onLine: true });
});

afterEach(() => {
  docs.forEach((doc) => doc.destroy());
  versioning.enabled = true;
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

async function open() {
  const doc = await Doc.fromPath(path);
  docs.push(doc);
  doc.attach(async () => new Blob(['my edits']));
  return doc;
}

it.each(['changed', 'deleted'])('refuses to restore a version over a file another window has %s', async (action) => {
  const doc = await open();
  const versionPath = 'writedoc/.versions/Report/1.docx';
  D.__fs.set(versionPath, new Blob(['old version'])); D.__meta.set(versionPath, 50);
  if (action === 'changed') await D.writeFile(path, new Blob(['other window']));
  else D.__fs.delete(path);
  D.writeFile.mockClear();

  await expect(doc.restoreVersion(versionPath)).rejects.toThrow(/another window/);
  expect(D.writeFile).not.toHaveBeenCalled();
  if (action === 'changed') expect(await (await D.__fs.get(path)).text()).toBe('other window');
  else expect(D.__fs.has(path)).toBe(false);
  // Nothing was written, so a clean document is still saved.
  expect(doc.status).toBe('saved');
});

it.each(['changed', 'deleted'])('protects the first edit when another window has %s the opened file', async (action) => {
  const doc = await open();
  if (action === 'changed') await D.writeFile(path, new Blob(['other window']));
  else D.__fs.delete(path);
  D.writeFile.mockClear();
  doc.changed();

  await expect(doc.save()).rejects.toThrow(/another window/);
  expect(D.writeFile).not.toHaveBeenCalled();
  expect(doc.dirty).toBe(true);
  if (action === 'changed') expect(await (await D.__fs.get(path)).text()).toBe('other window');
  else expect(D.__fs.has(path)).toBe(false);
});

it('saves the first edit when the opened file is unchanged', async () => {
  const doc = await open();
  doc.changed();
  expect(await doc.save()).toBe(true);
  expect(await (await D.__fs.get(path)).text()).toBe('my edits');
});

it('still opens and saves when file metadata is unavailable', async () => {
  D.statFile.mockRejectedValue(new Error('Metadata unavailable'));
  const doc = await open();
  doc.changed();
  expect(await doc.save()).toBe(true);
  expect(await (await D.__fs.get(path)).text()).toBe('my edits');
});

it.each(['changed', 'deleted'])('protects a newly created document when another window has %s it', async (action) => {
  const doc = Doc.blank({ name: 'New report' });
  docs.push(doc);
  doc.attach(async () => new Blob(['first save']));
  doc.changed();
  await doc.save();
  const createdPath = doc.path;
  expect(await (await D.__fs.get(createdPath)).text()).toBe('first save');

  if (action === 'changed') await D.writeFile(createdPath, new Blob(['other window']));
  else D.__fs.delete(createdPath);
  D.writeFile.mockClear();
  doc.attach(async () => new Blob(['my next edit']));
  doc.changed();
  await expect(doc.save()).rejects.toThrow(/another window/);
  expect(D.writeFile).not.toHaveBeenCalled();
  expect(doc.dirty).toBe(true);
  if (action === 'changed') expect(await (await D.__fs.get(createdPath)).text()).toBe('other window');
  else expect(D.__fs.has(createdPath)).toBe(false);
});

it('continues saving a newly created document when its cloud version is unchanged', async () => {
  const doc = Doc.blank({ name: 'New report' });
  docs.push(doc);
  doc.attach(async () => new Blob(['first save']));
  doc.changed(); await doc.save();
  doc.attach(async () => new Blob(['next edit']));
  doc.changed();
  expect(await doc.save()).toBe(true);
  expect(await (await D.__fs.get(doc.path)).text()).toBe('next edit');
});

it.each(['changed', 'deleted'])('protects a renamed document when another window has %s it', async (action) => {
  const doc = await open();
  expect(await doc.rename('Renamed')).toBeNull();
  const renamedPath = doc.path;
  if (action === 'changed') await D.writeFile(renamedPath, new Blob(['other window']));
  else D.__fs.delete(renamedPath);
  D.writeFile.mockClear();
  doc.changed();
  await expect(doc.save()).rejects.toThrow(/another window/);
  expect(D.writeFile).not.toHaveBeenCalled();
  expect(doc.dirty).toBe(true);
  if (action === 'changed') expect(await (await D.__fs.get(renamedPath)).text()).toBe('other window');
  else expect(D.__fs.has(renamedPath)).toBe(false);
});

it('does not treat its own rename as another window’s edit', async () => {
  const doc = await open();
  expect(await doc.rename('Renamed')).toBeNull();
  doc.changed();
  expect(await doc.save()).toBe(true);
  expect(await (await D.__fs.get(doc.path)).text()).toBe('my edits');
});

it('does not adopt another window’s changes as its own while renaming', async () => {
  const doc = await open();
  await D.writeFile(path, new Blob(['other window']));
  expect(await doc.rename('Renamed')).toMatch(/changed in another window/);
  expect(D.renameFile).not.toHaveBeenCalled();
  expect(doc.path).toBe(path);
  expect(await (await D.__fs.get(path)).text()).toBe('other window');
});
