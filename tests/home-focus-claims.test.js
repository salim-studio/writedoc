// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { homeView } from '../src/views/home.js';
import { closeAllModals } from '../src/ui/modal.js';
import { closeMenu } from '../src/ui/menu.js';
import { installFakeStore } from './helpers/fake-store.js';

vi.mock('../src/ui/toast.js', () => ({ toast: vi.fn() }));
let view, store, listing;

beforeEach(async () => {
  localStorage.clear();
  listing = null; // when set, the listing waits for it
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  store = installFakeStore(new Map([['writedoc/Report.docx', { blob: new Blob(['r']), modified: 2 }], ['writedoc/Notes.docx', { blob: new Blob(['n']), modified: 1 }]]));
  view = homeView({ openPath: vi.fn(), newDoc: vi.fn(), importFile: vi.fn() });
  document.body.append(view.el);
  await vi.waitFor(() => expect(view.el.querySelector('.file-row')).not.toBeNull());
});
afterEach(() => {
  view.destroy(); closeMenu(); closeAllModals(); document.body.replaceChildren();
  store.restore(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

async function remove(path) {
  view.el.querySelector(`[data-path="${path}"] .file-menu-btn`).click();
  [...document.querySelectorAll('[role="menuitem"]')].find((item) => item.textContent === 'Delete').click();
  // The dialog of an earlier deletion may still be closing: only an open one has the button to press.
  await vi.waitFor(() => expect(document.querySelector('.modal-root:not(.closing) .btn-danger')).not.toBeNull());
  document.querySelector('.modal-root:not(.closing) .btn-danger').click();
  await vi.waitFor(() => expect(view.el.querySelector(`[data-path="${path}"]`)).toBeNull());
}

it('does not take the focus from the search field when a remembered row lands late', async () => {
  let release;
  listing = new Promise((resolve) => { release = resolve; });
  store.gate = listing;
  view.el.querySelector('[data-path="writedoc/Report.docx"] .file-menu-btn').click();
  [...document.querySelectorAll('[role="menuitem"]')].find((item) => item.textContent.includes('Duplicate')).click();
  await vi.waitFor(() => expect(store.writes.length).toBeGreaterThan(0));
  // Meanwhile the user is typing a search.
  const search = view.el.querySelector('.home-search');
  search.focus();
  release();
  await vi.waitFor(() => expect(view.el.querySelectorAll('.file-row').length).toBe(3));
  expect(document.activeElement).toBe(search);
});

it('moves the focus to the search field or the New document button when the last visible document is deleted', async () => {
  const search = view.el.querySelector('.home-search');
  search.value = 'rep'; search.dispatchEvent(new Event('input'));
  expect(view.el.querySelectorAll('.file-row')).toHaveLength(1);
  await remove('writedoc/Report.docx');
  expect(document.activeElement).toBe(search);
  search.value = ''; search.dispatchEvent(new Event('input'));
  await vi.waitFor(() => expect(view.el.querySelectorAll('.file-row')).toHaveLength(1));
  await remove('writedoc/Notes.docx');
  expect(view.el.querySelectorAll('.file-row')).toHaveLength(0);
  expect(document.activeElement).not.toBe(document.body);
  expect(document.activeElement.textContent).toContain('New document');
});
