// @vitest-environment jsdom
import { afterEach, beforeEach, it, expect, vi } from 'vitest';
import * as D from '../src/lib/drive.js';

vi.mock('../src/lib/engine.js', () => ({ loadEngine: async () => { throw new Error('engine unavailable'); } }));
vi.mock('../src/lib/drive.js', async (importOriginal) => (await import('./helpers/drive-mock.js')).makeDriveMock(await importOriginal()));

let errors;
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {} }));
  D.__fs.clear(); D.__meta.clear(); D.__reset();
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  document.body.innerHTML = '<div id="app"></div>';
});
afterEach(() => { window.__writedoc?.current?.view.destroy(); errors.mockRestore(); vi.unstubAllGlobals(); });

it('shows the document list once, with the reason, when the file to open no longer exists', async () => {
  history.replaceState(null, '', '#/edit/writedoc%2FMissing.docx');
  await import('../src/main.js');
  await vi.waitFor(() => expect(window.__writedoc.current?.kind).toBe('home'));
  const home = window.__writedoc.current.view;
  await new Promise((resolve) => setTimeout(resolve, 60));
  // The same list is still up: it was not torn down and rebuilt by a second routing.
  expect(window.__writedoc.current.view).toBe(home);
  expect(D.listFiles).toHaveBeenCalledTimes(1);
  expect(document.querySelector('.toast')?.textContent).toContain('That file no longer exists');
  // The keyboard starts at the list's heading rather than staying on the page body.
  expect(document.activeElement.tagName).toBe('H1');
  expect(home.el.contains(document.activeElement)).toBe(true);
});
