import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/drive.js', async (importOriginal) => (await import('./helpers/drive-mock.js')).makeDriveMock(await importOriginal()));

import { Doc, versioning } from '../src/lib/doc.js';
import * as D from '../src/lib/drive.js';

describe('concurrent file creation', () => {
  let files, docs;
  beforeEach(() => {
    D.__fs.clear(); D.__meta.clear(); D.__reset();
    files = D.__fs; docs = [];
    versioning.enabled = false;
  });
  afterEach(() => { docs.forEach((doc) => doc.destroy()); versioning.enabled = true; });
  function document(name, text) {
    const doc = Doc.blank({ name });
    doc.attach(async () => new Blob([text])); doc.changed(); docs.push(doc);
    return doc;
  }

  it('preserves both new documents with the same name and autosaves to their own paths', async () => {
    const a = document('Report', 'first'), b = document('Report', 'second');
    await Promise.all([a.save(), b.save()]);
    expect(files.size).toBe(2);
    expect(a.path).not.toBe(b.path);
    expect(b.name).toBe('Report (1)');
    b.attach(async () => new Blob(['second updated'])); b.changed(); await b.save();
    expect(await files.get(a.path).text()).toBe('first');
    expect(await files.get(b.path).text()).toBe('second updated');
  });

  it('refuses a Save a copy collision that appears while exporting', async () => {
    const doc = document('Original', 'original');
    await doc.save();
    doc.attach(async () => { files.set('writedoc/Copy.docx', new Blob(['other tab'])); return new Blob(['mine']); });
    expect(await doc.saveAs('Copy')).toMatch(/already exists/);
    expect(doc.path).toBe('writedoc/Original.docx');
    expect(await files.get('writedoc/Copy.docx').text()).toBe('other tab');
  });
});
