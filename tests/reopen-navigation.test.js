// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { Doc } from '../src/lib/doc.js';
import * as D from '../src/lib/drive.js';

vi.mock('../src/lib/drive.js', async (importOriginal) => (await import('./helpers/drive-mock.js')).makeDriveMock(await importOriginal()));

vi.mock('../src/views/editor.js', () => ({ editorView: vi.fn(({ doc }) => ({
  el: document.createElement('div'), doc, flush: async () => true, destroy: vi.fn(() => doc.destroy()),
})) }));

it('does not let a delayed version reload overwrite a newer editor, even if reloading fails', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {} }));
  D.readFile.mockImplementation(async () => new Blob(['document']));
  D.statFile.mockImplementation(async () => null);
  document.body.innerHTML = '<div id="app"></div>';
  history.replaceState(null, '', '#/edit/writedoc%2FA.docx');
  await import('../src/main.js');
  const { editorView } = await import('../src/views/editor.js');
  await vi.waitFor(() => expect(window.__writedoc.current?.view.doc.path).toBe('writedoc/A.docx'));
  const reopen = editorView.mock.lastCall[0].reopen;
  const read = vi.spyOn(Doc, 'fromPath');
  try {
    for (const fail of [false, true]) {
      let finish;
      read.mockImplementationOnce(() => new Promise((resolve, reject) => { finish = fail ? reject : resolve; }));
      const pending = reopen('writedoc/A.docx');
      await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
      const path = fail ? 'writedoc/C.docx' : 'writedoc/B.docx';
      location.hash = `#/edit/${encodeURIComponent(path)}`;
      await vi.waitFor(() => expect(window.__writedoc.current?.view.doc.path).toBe(path));
      const newest = window.__writedoc.current.view;
      newest.doc.changed();
      finish(fail ? new Error('Reload failed') : new Doc({ path: 'writedoc/A.docx' }));
      await pending;
      expect(window.__writedoc.current.view).toBe(newest);
      expect(newest.doc.dirty).toBe(true);
      expect(newest.destroy).not.toHaveBeenCalled();
      expect(location.hash).toBe(`#/edit/${encodeURIComponent(path)}`);
    }
  } finally {
    window.__writedoc.current?.view.destroy(); read.mockRestore(); vi.unstubAllGlobals();
  }
});
