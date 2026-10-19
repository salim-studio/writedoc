// @vitest-environment jsdom
import { it, expect, vi } from 'vitest';
import { stubEditorBrowser } from './helpers/editor-browser.js';
// Booting the whole app shell can exceed the default timeout on a loaded machine.
vi.setConfig({ testTimeout: 60000 });

vi.mock('../src/lib/engine.js', () => ({ loadEngine: () => new Promise(() => {}) }));

const buttons = () => [...document.querySelectorAll('.modal-panel .row button')];
const dialogTitle = () => document.querySelector('[role="dialog"]')?.getAttribute('aria-label');

it('offers keep editing or leave when an unsaved document is left without a session', async () => {
  stubEditorBrowser();
  const write = vi.fn(async (path) => ({ path, name: path.split('/').pop() }));
  const sdk = {
    env: 'web',
    _signedIn: false,
    auth: {
      isSignedIn: () => sdk._signedIn,
      signIn: vi.fn(async () => { sdk._signedIn = true; }),
      getUser: async () => (sdk._signedIn ? { username: 'nariman' } : null),
    },
    fs: { readdir: vi.fn(async () => []), mkdir: async () => {}, stat: async () => null, write },
  };
  vi.stubGlobal('puter', sdk);
  document.body.innerHTML = '<div id="app"></div>';
  history.replaceState(null, '', '#/new');
  await import('../src/main.js');
  await vi.waitFor(() => expect(window.__writedoc.current?.kind).toBe('editor'));
  const view = window.__writedoc.current.view;
  const doc = view.doc;
  doc.attach(async () => new Blob(['unsaved work']));
  doc.changed();

  // Keep editing: the document, its edits, and its URL stay.
  view.el.querySelector('[aria-label="Home"]').click();
  await vi.waitFor(() => expect(dialogTitle()).toBe('Leave without saving?'));
  expect(buttons().map((b) => b.textContent)).toEqual(['Keep editing', 'Leave without saving']);
  expect(document.querySelector('.toast')).toBeNull();
  buttons()[0].click();
  await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
  expect(window.__writedoc.current?.view).toBe(view);
  expect(doc.dirty).toBe(true);
  expect(location.hash).toBe('#/new');
  expect(sdk.auth.signIn).not.toHaveBeenCalled();

  // Leave without saving: the edit is discarded and the list opens.
  location.hash = '#/home';
  await vi.waitFor(() => expect(dialogTitle()).toBe('Leave without saving?'));
  buttons()[1].click();
  await vi.waitFor(() => expect(window.__writedoc.current?.kind).toBe('home'));
  expect(write).not.toHaveBeenCalled();
  expect(location.hash).toBe('#/home');

  window.__writedoc.current.view.destroy();
  vi.unstubAllGlobals();
});
