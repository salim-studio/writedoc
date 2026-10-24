import { localStore } from '../lib/storage.js';

export const LAYOUT_STORE_KEY = 'writedoc:ui-layout-mode';

export const LAYOUT_MODES = [
  {
    id: 'hybrid',
    label: '🌟 مظهر هجين (Word + LibreOffice)',
    shortLabel: 'Word + LibreOffice',
    desc: 'دمج شريط وورد التفاعلي مع قوائم والشريط الجانبي لـ LibreOffice Writer',
    icon: 'sparkle',
  },
  {
    id: 'word',
    label: '📘 ميكروسوفت وورد (Word Ribbon)',
    shortLabel: 'Microsoft Word',
    desc: 'شريط أدوات حديث مع تبويبات وورد الكاملة',
    icon: 'brand',
  },
  {
    id: 'libre',
    label: '📗 ليبر أوفيس (LibreOffice Writer)',
    shortLabel: 'LibreOffice Writer',
    desc: 'القوائم الكاملة وشريط الأدوات والشريط الجانبي الكلاسيكي',
    icon: 'outline',
  },
];

const listeners = new Set();

export function getLayoutMode() {
  try {
    const saved = localStore()?.getItem(LAYOUT_STORE_KEY);
    if (saved && LAYOUT_MODES.some(m => m.id === saved)) return saved;
  } catch {
    /* fallback to default */
  }
  return 'hybrid'; // Default is Hybrid (Word + LibreOffice)
}

export function setLayoutMode(mode) {
  if (!LAYOUT_MODES.some(m => m.id === mode)) mode = 'hybrid';
  try {
    localStore()?.setItem(LAYOUT_STORE_KEY, mode);
  } catch {
    /* ignore storage errors */
  }
  applyLayoutMode(mode);
  for (const listener of listeners) {
    try {
      listener(mode);
    } catch (e) {
      console.error(e);
    }
  }
}

export function applyLayoutMode(mode = getLayoutMode(), target = document.documentElement) {
  if (!target) return;
  target.classList.remove('ui-mode-hybrid', 'ui-mode-word', 'ui-mode-libre');
  target.classList.add(`ui-mode-${mode}`);
  // Also set on root element or body
  if (document.body && target !== document.body) {
    document.body.classList.remove('ui-mode-hybrid', 'ui-mode-word', 'ui-mode-libre');
    document.body.classList.add(`ui-mode-${mode}`);
  }
}

export function onLayoutModeChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
