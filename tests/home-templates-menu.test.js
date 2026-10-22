// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { homeView } from '../src/views/home.js';
import * as D from '../src/lib/drive.js';
import { closeAllModals } from '../src/ui/modal.js';
import { closeMenu } from '../src/ui/menu.js';

vi.mock('../src/ui/toast.js', () => ({ toast: vi.fn() }));
let view, newFromTemplate;

beforeEach(async () => {
  vi.useFakeTimers(); localStorage.clear();
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.spyOn(D, 'listFiles').mockResolvedValue([]);
  newFromTemplate = vi.fn();
  view = homeView({ openPath: vi.fn(), newDoc: vi.fn(), newFromTemplate, importFile: vi.fn() });
  document.body.append(view.el);
  await vi.advanceTimersByTimeAsync(0);
});
afterEach(() => {
  view.destroy(); closeMenu(); closeAllModals(); vi.runAllTimers(); document.body.replaceChildren();
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

const templates = () => [...view.el.querySelectorAll('button')].find((b) => b.textContent === 'Templates');
const menuItems = () => [...document.querySelectorAll('.menu .menu-item, .menu .menu-note')].map((b) => b.textContent.trim());

it('opens with the built-in templates', async () => {
  templates().click();
  await vi.advanceTimersByTimeAsync(0);
  expect(document.querySelector('.menu[aria-label="Templates"]')).not.toBeNull();
  // Item text carries the template's hint after its name.
  expect(menuItems().some((t) => t.startsWith('Letter'))).toBe(true);
  expect(menuItems().some((t) => t.startsWith('Report'))).toBe(true);
});

it('starts a document from the chosen template', async () => {
  templates().click();
  await vi.advanceTimersByTimeAsync(0);
  [...document.querySelectorAll('.menu .menu-item')].find((item) => item.textContent.startsWith('Letter')).click();
  await vi.advanceTimersByTimeAsync(0);
  expect(newFromTemplate).toHaveBeenCalledWith('letter');
});

it('closes the menu on a second click instead of reopening it', async () => {
  const button = templates();
  button.click();
  await vi.advanceTimersByTimeAsync(0);
  expect(document.querySelector('.menu[aria-label="Templates"]')).not.toBeNull();
  // The click that closes it: the pointer goes down outside the menu, then the button's click fires.
  button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  expect(document.querySelector('.menu[aria-label="Templates"]')).toBeNull();
  button.click();
  await vi.advanceTimersByTimeAsync(0);
  expect(document.querySelector('.menu[aria-label="Templates"]')).toBeNull();
});

it('keeps the keyboard on the template the user had moved to', async () => {
  templates().click();
  await vi.advanceTimersByTimeAsync(0);
  const label = () => document.activeElement?.querySelector('.menu-label')?.firstChild?.textContent;
  expect(label()).toBe('Letter');
  document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  const moved = label();
  expect(moved).not.toBe('Letter');
  await vi.advanceTimersByTimeAsync(0);
  expect(label()).toBe(moved);
});
