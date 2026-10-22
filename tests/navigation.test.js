// @vitest-environment jsdom
import { it, expect, vi } from 'vitest';
import { stubEditorBrowser } from './helpers/editor-browser.js';
import * as D from '../src/lib/drive.js';
// Booting the whole app shell can exceed the default timeout on a loaded machine.
vi.setConfig({ testTimeout: 60000 });

// Exercise the actual router, document model, and editor shell without loading the canvas.
vi.mock('../src/lib/engine.js', () => ({ loadEngine: () => new Promise(() => {}) }));
vi.mock('../src/lib/drive.js', async (importOriginal) => (await import('./helpers/drive-mock.js')).makeDriveMock(await importOriginal()));

it('keeps the editor and its unsaved content when saving before navigation fails', async () => {
  stubEditorBrowser();
  document.body.innerHTML = '<div id="app"></div>';
  history.replaceState(null, '', '#/new');
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  await import('../src/main.js');
  await vi.waitFor(() => expect(window.__writedoc.current?.kind).toBe('editor'));
  const view = window.__writedoc.current.view;
  const doc = view.doc;
  const destroy = vi.spyOn(view, 'destroy');
  doc.attach(async () => new Blob(['unsaved work']));
  doc.changed();
  D.writeFile.mockRejectedValueOnce(new Error('offline'));

  location.hash = '#/home';
  await vi.waitFor(() => expect(doc.status).toBe('error'));
  expect(window.__writedoc.current?.view).toBe(view);
  expect(destroy).not.toHaveBeenCalled();
  expect(doc.dirty).toBe(true);
  expect(document.getElementById('app').contains(view.el)).toBe(true);
  expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Leave without saving?');
  document.querySelector('.modal-panel .btn-ghost').click();
  // Finish the cancelled navigation before issuing another one.
  await new Promise((resolve) => setTimeout(resolve, 0));

  // Retrying after the connection recovers saves and navigates normally.
  D.writeFile.mockResolvedValue({ path: 'writedoc/Untitled document.docx' });
  location.hash = '#/home';
  await vi.waitFor(() => expect(window.__writedoc.current?.kind).toBe('home'));
  expect(doc.dirty).toBe(false);
  expect(destroy).toHaveBeenCalledTimes(1);
  window.__writedoc.current.view.destroy();
  errors.mockRestore();
  vi.unstubAllGlobals();
});
