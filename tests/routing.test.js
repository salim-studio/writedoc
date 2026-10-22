// @vitest-environment jsdom
import { it, expect, vi } from 'vitest';
import * as D from '../src/lib/drive.js';

vi.mock('../src/lib/drive.js', async (importOriginal) => (await import('./helpers/drive-mock.js')).makeDriveMock(await importOriginal()));

vi.mock('../src/views/editor.js', () => ({
  editorView: vi.fn(({ doc }) => ({
    el: document.createElement('div'), doc,
    flush: () => doc.flush(), destroy: () => doc.destroy(),
  })),
}));

it('honors the latest navigation while another document is still loading', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {} }));
  let finishFirst;
  const first = new Promise((resolve) => { finishFirst = resolve; });
  const read = D.readFile;
  read.mockImplementation((path) => path === 'writedoc/A.docx' ? first : Promise.resolve(new Blob(['B'])));
  document.body.innerHTML = '<div id="app"></div>';
  history.replaceState(null, '', '#/home');
  await import('../src/main.js');
  const { editorView } = await import('../src/views/editor.js');
  await vi.waitFor(() => expect(window.__writedoc.current?.kind).toBe('home'));

  location.hash = '#/edit/writedoc%2FA.docx';
  await vi.waitFor(() => expect(read).toHaveBeenCalledWith('writedoc/A.docx'));
  const changed = new Promise((resolve) => window.addEventListener('hashchange', resolve, { once: true }));
  location.hash = '#/edit/writedoc%2FB.docx';
  await changed;
  finishFirst(new Blob(['A']));

  await vi.waitFor(() => expect(window.__writedoc.current?.view.doc?.path).toBe('writedoc/B.docx'));
  expect(editorView.mock.calls.map(([args]) => args.doc.path)).toEqual(['writedoc/B.docx']);
  expect(location.hash).toBe('#/edit/writedoc%2FB.docx');

  // Allocating a file path during a first save must not replace the destination URL.
  location.hash = '#/new';
  await vi.waitFor(() => expect(window.__writedoc.current?.view.doc?.path).toBeNull());
  const doc = window.__writedoc.current.view.doc;
  doc.attach(async () => new Blob(['new work']));
  doc.changed();
  location.hash = '#/home';
  await vi.waitFor(() => expect(window.__writedoc.current?.kind).toBe('home'));
  expect(doc.dirty).toBe(false);
  expect(location.hash).toBe('#/home');
  window.__writedoc.current.view.destroy();
  vi.unstubAllGlobals();
});
