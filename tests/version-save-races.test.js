import { afterEach, expect, it, vi } from 'vitest';

vi.mock('../src/lib/drive.js', async (importOriginal) => (await import('./helpers/drive-mock.js')).makeDriveMock(await importOriginal()));

import { Doc, versioning } from '../src/lib/doc.js';
import * as D from '../src/lib/drive.js';
import { listVersions } from '../src/lib/versions.js';

let doc;
afterEach(() => { doc?.destroy(); vi.unstubAllGlobals(); versioning.enabled = true; });

it.each(['rename', 'remove'])('serializes manual version creation with %s', async (action) => {
  D.__fs.clear(); D.__meta.clear(); D.__reset();
  const files = D.__fs;
  files.set('writedoc/A.docx', new Blob(['original'])); D.__meta.set('writedoc/A.docx', 1);
  versioning.enabled = true;
  doc = new Doc({ name: 'A', path: 'writedoc/A.docx', blob: files.get('writedoc/A.docx') });
  let release;
  doc.attach(() => new Promise((resolve) => { release = resolve; }));
  const snapshot = doc.saveVersionNow();
  await vi.waitFor(() => expect(release).toBeTypeOf('function'));
  const changing = action === 'rename' ? doc.rename('B') : doc.remove();
  await Promise.resolve(); await Promise.resolve();
  release(new Blob(['snapshot'])); await Promise.all([snapshot, changing]);
  expect(await listVersions('writedoc/A.docx')).toEqual([]);
  expect(await listVersions('writedoc/B.docx')).toHaveLength(action === 'rename' ? 1 : 0);
});
