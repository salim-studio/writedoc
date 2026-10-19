// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { homeView } from '../src/views/home.js';
import { session } from '../src/lib/session.js';
import { closeMenu } from '../src/ui/menu.js';

let sdk, view;
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {} }));
  sdk = {
    env: 'web',
    _signedIn: false,
    auth: {
      isSignedIn: () => sdk._signedIn,
      signIn: vi.fn(async () => { sdk._signedIn = true; }),
      getUser: async () => (sdk._signedIn ? { username: 'nariman' } : null),
    },
    fs: {
      readdir: vi.fn(async () => [{ path: 'writedoc/Report.docx', name: 'Report.docx', size: 12, modified: 1 }]),
      stat: async () => null, mkdir: async () => {},
    },
  };
  vi.stubGlobal('puter', sdk);
});
afterEach(() => {
  view?.destroy();
  closeMenu();
  document.body.replaceChildren();
  session.state = 'unknown';
  session.user = null;
  vi.unstubAllGlobals();
});

it('leaves the list empty while signed out, then lists the documents once signed in', async () => {
  await session.init();
  view = homeView({ openPath: vi.fn(), newDoc: vi.fn(), newFromTemplate: vi.fn(), importFile: vi.fn() });
  document.body.append(view.el);
  await Promise.resolve();

  const list = view.el.querySelector('.file-list');
  expect(list.textContent).toBe('');
  expect(list.querySelector('.file-row')).toBeNull();
  expect(sdk.fs.readdir).not.toHaveBeenCalled();
  const account = view.el.querySelector('.user-btn');
  expect(account.title).toBe('Not signed in');

  // Signing in fills the list.
  await session.signIn();
  await vi.waitFor(() => expect(list.querySelector('.file-row .file-name')?.textContent).toBe('Report'));
  expect(account.title).toBe('nariman');
  expect(account.querySelector('.user-avatar svg')).not.toBeNull();
});
