// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { homeView } from '../src/views/home.js';
import * as D from '../src/lib/drive.js';
import { closeMenu } from '../src/ui/menu.js';
import { closeAllModals } from '../src/ui/modal.js';

const pending = () => { let resolve, reject; const promise = new Promise((done, fail) => { resolve = done; reject = fail; }); return { promise, resolve, reject }; };
let view, openPath, importFile;
beforeEach(async () => {
  vi.useFakeTimers(); localStorage.clear();
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.spyOn(D, 'listFiles').mockResolvedValue([]);
  openPath = vi.fn(); importFile = vi.fn();
  view = homeView({ openPath, importFile, newDoc: vi.fn() });
  document.body.append(view.el);
  await vi.advanceTimersByTimeAsync(0);
});
afterEach(() => {
  view?.destroy(); closeMenu(); closeAllModals(); document.body.replaceChildren();
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});
const leave = () => { view.destroy(); view.el.remove(); };

it('closes the template menu when the view goes away', async () => {
  [...view.el.querySelectorAll('button')].find((b) => b.textContent === 'Templates').click();
  await vi.advanceTimersByTimeAsync(0);
  expect(document.querySelector('[role="menu"]')).not.toBeNull();
  leave(); await vi.advanceTimersByTimeAsync(0);
  expect(document.querySelector('[role="menu"]')).toBeNull();
});

it('finishes a bulk document write without opening a text import over the new view', async () => {
  const written = pending(); vi.spyOn(D, 'writeFile').mockReturnValue(written.promise);
  vi.spyOn(D, 'uniqueName').mockResolvedValue('Imported.docx');
  const input = view.el.querySelector('input[type="file"]');
  Object.defineProperty(input, 'files', { value: [new File(['word'], 'Imported.docx'), new File(['text'], 'Notes.txt')] });
  input.dispatchEvent(new Event('change')); await vi.advanceTimersByTimeAsync(0);
  expect(D.writeFile).toHaveBeenCalledOnce();
  leave(); written.resolve({}); await vi.advanceTimersByTimeAsync(0);
  expect(importFile).not.toHaveBeenCalled();
});

it('does not replace a newer file listing with an older response', async () => {
  const old = pending(), recent = pending();
  D.listFiles.mockReturnValueOnce(old.promise).mockReturnValueOnce(recent.promise);
  const first = view.reload(), second = view.reload();
  recent.resolve([{ name: 'Latest.docx', path: 'writedoc/Latest.docx' }]); await second;
  old.resolve([{ name: 'Stale.docx', path: 'writedoc/Stale.docx' }]); await first;
  expect(view.el.querySelector('.file-name').textContent).toBe('Latest');
});

it.each(['stale listing', 'listing error', 'earlier listing error', 'failed deletion'])('keeps a concurrent deletion consistent with a duplication refresh (%s)', async (result) => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const removed = { name: 'Removed.docx', path: 'writedoc/Removed.docx' };
  const kept = { name: 'Kept.docx', path: 'writedoc/Kept.docx' };
  const copy = { name: 'Kept copy.docx', path: 'writedoc/Kept copy.docx' };
  D.listFiles.mockResolvedValueOnce([removed, kept]);
  await view.reload();
  const deletion = pending(), listing = pending();
  vi.spyOn(D, 'deleteFile').mockReturnValueOnce(deletion.promise).mockResolvedValue();
  vi.spyOn(D, 'listFolder').mockResolvedValue([]);
  vi.spyOn(D, 'readFile').mockResolvedValue(new Blob(['kept']));
  vi.spyOn(D, 'createFile').mockResolvedValue(copy.path);
  const choose = (name, action) => {
    view.el.querySelector(`[aria-label="Options for ${name}"]`).click();
    [...document.querySelectorAll('[role="menuitem"]')].find((item) => item.querySelector('.menu-label')?.textContent === action).click();
  };
  choose(removed.name, 'Delete');
  document.querySelector('.modal-root:last-child .btn-danger').click();
  await vi.advanceTimersByTimeAsync(0);
  expect(D.deleteFile).toHaveBeenCalledWith(removed.path);
  D.listFiles.mockReturnValueOnce(listing.promise).mockResolvedValue([kept, copy]);
  choose(kept.name, 'Duplicate'); await vi.advanceTimersByTimeAsync(0);
  expect(D.createFile).toHaveBeenCalledOnce();
  expect(view.el.textContent).toContain('Loading your documents');
  if (result === 'earlier listing error') { listing.reject(new Error('Old request failed')); await vi.advanceTimersByTimeAsync(0); }
  if (result === 'failed deletion') deletion.reject(new Error('Deletion unavailable'));
  else deletion.resolve();
  await vi.advanceTimersByTimeAsync(0);
  if (result === 'listing error') listing.reject(new Error('Old request failed'));
  else if (result !== 'earlier listing error') listing.resolve([removed, kept, copy]);
  await vi.advanceTimersByTimeAsync(0);
  const names = [...view.el.querySelectorAll('.file-name')].map((element) => element.textContent).sort();
  expect(names).toEqual(result === 'failed deletion' ? ['Kept', 'Kept copy', 'Removed'] : ['Kept', 'Kept copy']);
  expect(view.el.textContent).not.toContain('Could not load');
  expect(D.listFiles).toHaveBeenCalledTimes(result === 'failed deletion' ? 3 : 4);
  // A subsequently recreated file at the same path must remain discoverable.
  D.listFiles.mockResolvedValue([removed, kept, copy]);
  await view.reload();
  expect(view.el.querySelector('[aria-label="Options for Removed.docx"]')).not.toBeNull();
});
