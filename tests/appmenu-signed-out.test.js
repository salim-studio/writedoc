// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { openAppMenu } from '../src/ui/appmenu.js';
import { session } from '../src/lib/session.js';
import { closeMenu } from '../src/ui/menu.js';

const items = () => [...document.querySelectorAll('[role="menuitem"]')].map((item) => item.textContent);
const header = () => document.querySelector('.menu-header')?.textContent;

let sdk, anchor;
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {} }));
  sdk = {
    env: 'web',
    _signedIn: false,
    auth: {
      isSignedIn: () => sdk._signedIn,
      signIn: vi.fn(async () => { sdk._signedIn = true; }),
      getUser: async () => (sdk._signedIn ? { username: 'nariman' } : null),
      signOut: vi.fn(),
    },
  };
  vi.stubGlobal('puter', sdk);
  anchor = document.createElement('button');
  document.body.append(anchor);
});
afterEach(() => {
  closeMenu();
  document.body.replaceChildren();
  session.state = 'unknown';
  session.user = null;
  vi.unstubAllGlobals();
});

it('offers neither sign-in nor sign-out while nobody is signed in, and sign-out once signed in', async () => {
  await session.init();
  openAppMenu(anchor);
  expect(header()).toContain('Not signed in');
  expect(items().some((l) => l.startsWith('Sign in'))).toBe(false);
  expect(items().some((l) => l.startsWith('Sign out'))).toBe(false);

  await session.signIn();
  openAppMenu(anchor);
  expect(header()).toContain('Account');
  expect(header()).not.toContain('nariman');
  expect(items().some((l) => l.startsWith('Sign out'))).toBe(true);
  expect(items().some((l) => l.startsWith('Sign in'))).toBe(false);
});
