// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { getLayoutMode, setLayoutMode, LAYOUT_MODES, applyLayoutMode } from '../src/ui/layout-mode.js';
import { createLibreDeck, DECK_TABS } from '../src/ui/libre-deck.js';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
  document.body.className = '';
});

describe('Layout Mode Switcher (Hybrid, Word, LibreOffice)', () => {
  it('defaults to hybrid layout mode', () => {
    expect(getLayoutMode()).toBe('hybrid');
  });

  it('switches and persists layout modes', () => {
    setLayoutMode('word');
    expect(getLayoutMode()).toBe('word');

    setLayoutMode('libre');
    expect(getLayoutMode()).toBe('libre');

    setLayoutMode('hybrid');
    expect(getLayoutMode()).toBe('hybrid');
  });

  it('applies classes to document elements correctly', () => {
    applyLayoutMode('hybrid', document.documentElement);
    expect(document.documentElement.classList.contains('ui-mode-hybrid')).toBe(true);

    applyLayoutMode('word', document.documentElement);
    expect(document.documentElement.classList.contains('ui-mode-word')).toBe(true);
    expect(document.documentElement.classList.contains('ui-mode-hybrid')).toBe(false);

    applyLayoutMode('libre', document.documentElement);
    expect(document.documentElement.classList.contains('ui-mode-libre')).toBe(true);
  });

  it('lists all three essential layout modes', () => {
    expect(LAYOUT_MODES.map(m => m.id)).toEqual(['hybrid', 'word', 'libre']);
  });
});

describe('LibreOffice Right Sidebar Deck', () => {
  it('creates deck container with all 5 iconic LibreOffice tabs', () => {
    const c = {
      fontFamily: document.createElement('select'),
      fontSize: document.createElement('input'),
      bold: document.createElement('button'),
      italic: document.createElement('button'),
      underline: document.createElement('button'),
      strike: document.createElement('button'),
      subscript: document.createElement('button'),
      superscript: document.createElement('button'),
      textColor: document.createElement('button'),
      highlight: document.createElement('button'),
      clearTextFormatting: document.createElement('button'),
      alignmentButtons: [
        document.createElement('button'),
        document.createElement('button'),
        document.createElement('button'),
        document.createElement('button'),
      ],
      bullets: document.createElement('button'),
      numbers: document.createElement('button'),
      outdent: document.createElement('button'),
      indent: document.createElement('button'),
      lineSpacing: document.createElement('select'),
      tableActions: document.createElement('select'),
      paragraphStyle: document.createElement('select'),
      pageBreak: document.createElement('button'),
      pageBreakBefore: document.createElement('button'),
      pageSetup: document.createElement('button'),
    };

    const deck = createLibreDeck({ c, w: {}, a: {}, focusEditor: () => {} });
    expect(deck.el).toBeInstanceOf(HTMLElement);
    expect(deck.el.classList.contains('libre-deck-container')).toBe(true);
    expect(deck.el.classList.contains('canvas-inspector')).toBe(true);

    const tabs = deck.el.querySelectorAll('.libre-deck-tab-btn');
    expect(tabs.length).toBe(DECK_TABS.length);
    expect(tabs.length).toBe(5);

    // Test tab selection
    deck.selectTab('page');
    expect(deck.el.querySelector('.libre-deck-title').textContent).toContain('الصفحة');

    deck.selectTab('styles');
    expect(deck.el.querySelector('.libre-deck-title').textContent).toContain('الأنماط');

    deck.selectTab('tools');
    expect(deck.el.querySelector('.libre-deck-title').textContent).toContain('أدوات');

    // Test toggle
    expect(deck.isOpen()).toBe(true);
    deck.toggle();
    expect(deck.isOpen()).toBe(false);
    expect(deck.el.classList.contains('is-collapsed')).toBe(true);

    deck.destroy();
  });
});
