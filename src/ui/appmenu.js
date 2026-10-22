/**
 * The settings menu shared by the home screen and the editor: theme,
 * shortcuts, about, and the preferences that apply everywhere.
 */

import { el } from './dom.js';
import { icon } from './icons.js';
import { openMenu } from './menu.js';
import { openModal } from './modal.js';
import { openShortcuts } from './shortcuts.js';
import { segmented } from './segmented.js';
import { currentTheme, isDark, darkPage, setDarkPage } from './theme.js';
import { UNITS, recallUnit, rememberUnit, unitLabel } from '../lib/units.js';
import { autocorrectEnabled, setAutocorrectEnabled, capitalizeSentencesEnabled, setCapitalizeSentencesEnabled } from '../lib/autocorrect.js';
import { autolinkEnabled, setAutolinkEnabled } from '../lib/linkify.js';
import { session } from '../lib/session.js';

export function openAppMenu(anchor, { extraItems = [] } = {}) {
  let opened = null;
  // One radio group, like the dialogs' choices: Left and Right move between the themes.
  const themeRow = el('div.menu-theme', {},
    segmented([['system', 'monitor', 'System'], ['light', 'sun', 'Light'], ['dark', 'moon', 'Dark']]
      .map(([mode, ic, label]) => [mode, [el('span', { html: icon(ic, 15, 2) }), label]]),
    currentTheme(), (mode) => {
      session.setTheme(mode);
      // The dark page option follows the theme picked here without reopening the menu.
      darkPageItem.disabled = !isDark();
      const button = [...(opened?.menu?.querySelectorAll('.menu-item') || [])].find((node) => node.querySelector('.menu-label')?.firstChild?.textContent === darkPageItem.label);
      if (button) button.disabled = darkPageItem.disabled;
    }, 'Appearance'));
  const darkPageItem = { label: 'Dark page', icon: 'brand', checked: darkPage(), disabled: !isDark(), hint: 'Dark paper with the dark theme', onSelect: () => setDarkPage(!darkPage()) };

  const items = [
    { header: 'Settings' },
    { custom: themeRow },
    darkPageItem,
    { separator: true },
    ...extraItems,
    { label: 'Measurement units', icon: 'ruler', hint: unitLabel(recallUnit()), onSelect: () => openUnitsMenu(anchor) },
    { label: 'Autocorrect as you type', checked: autocorrectEnabled(), hint: 'Smart quotes, dashes, ellipses, symbols, fractions', onSelect: () => setAutocorrectEnabled(!autocorrectEnabled()) },
    { label: 'Capitalize the first letter of sentences', checked: capitalizeSentencesEnabled(), onSelect: () => setCapitalizeSentencesEnabled(!capitalizeSentencesEnabled()) },
    { label: 'Link web addresses as you type', checked: autolinkEnabled(), hint: 'URLs and emails become links on space or return', onSelect: () => setAutolinkEnabled(!autolinkEnabled()) },
    { label: 'Keyboard shortcuts', icon: 'keyboard', onSelect: openShortcuts },
    { label: 'About writedoc', icon: 'info', onSelect: openAbout },
  ];
  opened = openMenu({ anchor, items: items.filter(Boolean), align: 'end', label: 'Settings', minWidth: 250 });
}

const accountFaces = new WeakMap();
const ACCOUNT_ICON = icon('settings', 17, 2);

/** The settings button always shows the same gear. */
export function renderAccountButton(button) {
  button.title = 'Settings';
  button.setAttribute('aria-label', 'Settings');
  if (button.firstElementChild?.classList.contains('user-avatar')) return;
  button.replaceChildren(el('span.user-avatar', { html: ACCOUNT_ICON, 'aria-hidden': 'true' }));
}

/** Inches or centimeters, for the ruler and every dialog that measures. */
export function openUnitsMenu(anchor) {
  const current = recallUnit();
  openMenu({
    anchor, align: 'end', label: 'Measurement units', minWidth: 220,
    items: [
      { header: 'Measurement units' },
      ...UNITS.map((u) => ({ label: u.label, radio: true, checked: current === u.id, onSelect: () => rememberUnit(u.id) })),
      { separator: true },
      { note: 'Used by the ruler, page setup, indentation, and tables' },
    ],
  });
}

export function openAbout() {
  openModal({
    title: 'writedoc',
    content: el('div', {},
      el('p.modal-text', {}, 'writedoc is a private word processor with an original canvas editor. Your files are saved as .docx in this browser, and stay on your device.'),
      el('p.modal-text', {}, 'This version supports text and paragraph formatting, selection, undo, and DOCX downloads. Advanced document features are not supported yet.'),
      el('p.small.muted', {}, '© 2026 salim-slimani.')),
  });
}
