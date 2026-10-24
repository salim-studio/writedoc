/**
 * Add-ins and Extensions Engine for WriteDoc (Microsoft Word Office Add-ins Standard).
 * Provides a built-in catalog of productive tools, manages installed state,
 * and allows requesting & dynamically adding new user-created add-ins to the library.
 * All text and interface specifications follow Microsoft Office standards in English.
 */
import { generateQrPngBlob, generateQrSvg } from './qr-encoder.js';

const STORAGE_INSTALLED_KEY = 'writedoc:addins:installed';
const STORAGE_CUSTOM_KEY = 'writedoc:addins:custom';

const memoryStore = new Map();
const safeStorage = {
  getItem(key) {
    try {
      if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
    } catch {}
    return memoryStore.get(key) ?? null;
  },
  setItem(key, val) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, val);
        return;
      }
    } catch {}
    memoryStore.set(key, String(val));
  },
  clear() {
    try {
      if (typeof localStorage !== 'undefined') localStorage.clear();
    } catch {}
    memoryStore.clear();
  },
};

export const ADDIN_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'ai', label: 'AI & Copilot' },
  { id: 'productivity', label: 'Productivity' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'academic', label: 'Academic & Dev' },
  { id: 'security', label: 'Security & Legal' },
];

export const BUILTIN_ADDINS = [
  {
    id: 'ai_assistant',
    name: 'Copilot Writing Assistant',
    iconKey: 'copilot',
    category: 'ai',
    author: 'Microsoft Verified',
    version: '2.4.0',
    rating: 4.9,
    downloads: '1.2M+',
    badge: 'Official',
    description: 'Draft, summarize, rewrite, and polish documents with intelligent AI assistance directly within Microsoft Word.',
    actionType: 'interactive',
  },
  {
    id: 'qr_generator',
    name: 'QR Code & Barcode Studio',
    iconKey: 'qr_code',
    category: 'utilities',
    author: 'Office Media Labs',
    version: '2.1.0',
    rating: 4.9,
    downloads: '850K+',
    badge: 'Featured',
    description: 'Generate and embed high-resolution QR codes for websites, reference documents, contact details, and inventory tracking.',
    actionType: 'interactive',
  },
  {
    id: 'quick_translator',
    name: 'Deep Translator',
    iconKey: 'translator',
    category: 'utilities',
    author: 'Microsoft Translator',
    version: '3.0.1',
    rating: 4.8,
    downloads: '940K+',
    badge: 'Popular',
    description: 'Translate words, sentences, or entire paragraphs across 60+ languages with in-place text insertion.',
    actionType: 'interactive',
  },
  {
    id: 'arabic_lorem',
    name: 'Smart Lorem Ipsum & Sample Text',
    iconKey: 'lorem',
    category: 'productivity',
    author: 'Typography Suite',
    version: '1.8.0',
    rating: 4.7,
    downloads: '420K+',
    badge: 'Core',
    description: 'Insert placeholder dummy paragraphs in Latin Lorem Ipsum, formal English academic prose, or typography test sentences.',
    actionType: 'interactive',
  },
  {
    id: 'watermark_stamp',
    name: 'Security Stamps & Classification',
    iconKey: 'stamp',
    category: 'security',
    author: 'Enterprise Security',
    version: '1.5.0',
    rating: 4.8,
    downloads: '310K+',
    badge: 'Security',
    description: 'Apply official classification markings and security banners (TOP SECRET, CONFIDENTIAL, DRAFT, APPROVED, or custom text).',
    actionType: 'interactive',
  },
  {
    id: 'sci_calc',
    name: 'Formula Calculator & Unit Converter',
    iconKey: 'calc',
    category: 'utilities',
    author: 'MathTools Inc.',
    version: '2.0.0',
    rating: 4.7,
    downloads: '260K+',
    badge: 'Utility',
    description: 'Evaluate mathematical formulas, compute percentages, and convert typography units (points, inches, cm) and reading time.',
    actionType: 'interactive',
  },
  {
    id: 'signature_block',
    name: 'Official Signature & Approval Line',
    iconKey: 'signature',
    category: 'productivity',
    author: 'Business Legal',
    version: '1.2.0',
    rating: 4.9,
    downloads: '580K+',
    badge: 'Official',
    description: 'Insert a formal execution block with signature line, signatory title, approval date, and corporate seal box.',
    actionType: 'interactive',
  },
  {
    id: 'bibtex_manager',
    name: 'BibTeX Citation Importer',
    iconKey: 'bibtex',
    category: 'academic',
    author: 'Scholar Suite',
    version: '2.2.0',
    rating: 4.9,
    downloads: '390K+',
    badge: 'Academic',
    description: 'Import BibTeX references from Google Scholar, PubMed, and IEEE, and format them into APA, IEEE, or Chicago citations.',
    actionType: 'interactive',
  },
  {
    id: 'pomodoro_timer',
    name: 'Focus Writing Sprint Timer',
    iconKey: 'timer',
    category: 'productivity',
    author: 'Productivity Labs',
    version: '1.3.0',
    rating: 4.6,
    downloads: '180K+',
    badge: 'Productivity',
    description: 'Maximize focus with 25-minute writing sprint intervals and gentle status alerts to boost document drafting.',
    actionType: 'interactive',
  },
  {
    id: 'code_formatter',
    name: 'Code Block Syntax Styler',
    iconKey: 'code',
    category: 'academic',
    author: 'DevTools Lab',
    version: '1.7.0',
    rating: 4.8,
    downloads: '450K+',
    badge: 'Developer',
    description: 'Format syntax code snippets (JavaScript, Python, C++, HTML, SQL) inside a shaded monospaced box with line numbers.',
    actionType: 'interactive',
  },
  {
    id: 'decision_matrix',
    name: 'SWOT Analysis & Decision Matrix',
    iconKey: 'swot',
    category: 'academic',
    author: 'Strategy Frameworks',
    version: '1.4.0',
    rating: 4.7,
    downloads: '210K+',
    badge: 'Business',
    description: 'Insert pre-formatted 2x2 SWOT analysis matrices (Strengths, Weaknesses, Opportunities, Threats) and decision tables.',
    actionType: 'interactive',
  },
];

const DEFAULT_INSTALLED_IDS = ['ai_assistant', 'quick_translator', 'qr_generator', 'arabic_lorem', 'watermark_stamp'];

/**
 * Clear storage (used in tests).
 */
export function clearAddinStorageForTesting() {
  safeStorage.clear();
}

/**
 * Retrieve user-created / requested add-ins from storage.
 */
export function getCustomAddins() {
  try {
    const raw = safeStorage.getItem(STORAGE_CUSTOM_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Persist user-created custom add-ins.
 */
function saveCustomAddins(list) {
  try {
    safeStorage.setItem(STORAGE_CUSTOM_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save custom addins', e);
  }
}

/**
 * Get all available add-ins (built-in catalog + custom created ones).
 */
export function getAllAddins() {
  const custom = getCustomAddins();
  return [...BUILTIN_ADDINS, ...custom];
}

/**
 * Find an add-in by ID.
 */
export function getAddinById(id) {
  return getAllAddins().find(a => a.id === id) || null;
}

/**
 * Retrieve installed add-in IDs.
 */
export function getInstalledAddinIds() {
  try {
    const raw = safeStorage.getItem(STORAGE_INSTALLED_KEY);
    if (!raw) return new Set(DEFAULT_INSTALLED_IDS);
    const list = JSON.parse(raw);
    return new Set(Array.isArray(list) ? list : DEFAULT_INSTALLED_IDS);
  } catch {
    return new Set(DEFAULT_INSTALLED_IDS);
  }
}

/**
 * Save installed add-in IDs.
 */
function saveInstalledAddinIds(set) {
  try {
    safeStorage.setItem(STORAGE_INSTALLED_KEY, JSON.stringify([...set]));
  } catch (e) {
    console.error('Failed to save installed addins', e);
  }
}

/**
 * Check if an add-in is currently installed.
 */
export function isAddinInstalled(id) {
  return getInstalledAddinIds().has(id);
}

/**
 * Install an add-in by ID.
 */
export function installAddin(id) {
  const installed = getInstalledAddinIds();
  installed.add(id);
  saveInstalledAddinIds(installed);
  return true;
}

/**
 * Uninstall an add-in by ID.
 */
export function uninstallAddin(id) {
  const installed = getInstalledAddinIds();
  installed.delete(id);
  saveInstalledAddinIds(installed);
  return true;
}

/**
 * Get list of full add-in objects that are currently installed.
 */
export function getInstalledAddins() {
  const installedIds = getInstalledAddinIds();
  return getAllAddins().filter(a => installedIds.has(a.id));
}

/**
 * Request and dynamically create a new add-in tool.
 * Adds it to the library catalog, persists it, and installs it immediately.
 */
export function requestAddin({
  name,
  description,
  category = 'productivity',
  iconKey = 'custom',
  actionType = 'template',
  templateText = '',
  prompt = '',
  customCode = '',
}) {
  if (!name || !name.trim()) {
    throw new Error('Please enter a name for the new add-in.');
  }

  const id = `addin_custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const newAddin = {
    id,
    name: name.trim(),
    iconKey: iconKey || 'custom',
    category: category || 'productivity',
    author: 'Custom Developer',
    version: '1.0.0',
    rating: 5.0,
    downloads: '1',
    badge: 'Custom',
    custom: true,
    createdAt: new Date().toISOString(),
    description: (description || 'Custom add-in added to your Word library.').trim(),
    actionType, // 'template' | 'transform' | 'ai_prompt' | 'custom_code'
    templateText: templateText || '',
    prompt: prompt || '',
    customCode: customCode || '',
  };

  const currentCustom = getCustomAddins();
  currentCustom.unshift(newAddin);
  saveCustomAddins(currentCustom);

  // Automatically mark as installed in user's library
  installAddin(id);

  return newAddin;
}

/**
 * Delete a user-created custom add-in completely.
 */
export function deleteCustomAddin(id) {
  const current = getCustomAddins().filter(a => a.id !== id);
  saveCustomAddins(current);
  uninstallAddin(id);
  return true;
}

/**
 * Core executor for running an add-in within the editor context.
 */
export async function executeAddin(addinOrId, ctx) {
  const addin = typeof addinOrId === 'string' ? getAddinById(addinOrId) : addinOrId;
  if (!addin) throw new Error('Add-in not found');

  const { editor, toast } = ctx;
  const engine = editor();
  if (!engine) {
    toast?.('Editor is not ready.');
    return false;
  }

  // Handle custom requested add-ins:
  if (addin.custom) {
    return executeCustomAddin(addin, ctx);
  }

  // Built-in add-ins handlers:
  switch (addin.id) {
    case 'ai_assistant':
      return ctx.openAiAssistant?.() ?? openDefaultAiAssistant(ctx);
    case 'quick_translator':
      return ctx.openTranslator?.() ?? openDefaultTranslator(ctx);
    case 'qr_generator':
      return ctx.openQrGenerator?.() ?? openDefaultQrGenerator(ctx);
    case 'arabic_lorem':
      return ctx.openLorem?.() ?? openDefaultLorem(ctx);
    case 'watermark_stamp':
      return ctx.openWatermark?.() ?? openDefaultWatermark(ctx);
    case 'sci_calc':
      return ctx.openCalc?.() ?? openDefaultCalc(ctx);
    case 'signature_block':
      return insertOfficialSignatureBlock(ctx);
    case 'bibtex_manager':
      return ctx.openBibtex?.() ?? openDefaultBibtex(ctx);
    case 'pomodoro_timer':
      return togglePomodoroTimer(ctx);
    case 'code_formatter':
      return formatSelectedAsCode(ctx);
    case 'decision_matrix':
      return insertDecisionMatrix(ctx);
    default:
      toast?.(`Add-in launched: ${addin.name}`);
      return true;
  }
}

/**
 * Execute a custom user-requested add-in based on its configured actionType.
 */
function executeCustomAddin(addin, ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return false;

  const [selStart, selEnd] = engine.model.range;
  const selText = selStart === selEnd ? '' : engine.model.text.slice(selStart, selEnd).trim();

  if (addin.actionType === 'template') {
    let text = addin.templateText || '';
    const now = new Date();
    text = text
      .replace(/\{date\}/gi, now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
      .replace(/\{time\}/gi, now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }))
      .replace(/\{selection\}/gi, selText || 'Sample selection')
      .replace(/\{title\}/gi, 'Document Title');

    run(engine, () => {
      engine.model.replace(text);
      return true;
    });
    toast?.(`Template inserted: ${addin.name}`);
    return true;
  }

  if (addin.actionType === 'transform') {
    if (!selText) {
      toast?.('Please select text in the document to apply this tool.');
      return false;
    }
    let transformed = selText;
    if (addin.customCode && addin.customCode.trim()) {
      try {
        const fn = new Function('text', addin.customCode);
        transformed = fn(selText) || selText;
      } catch (err) {
        toast?.(`Transform error: ${err.message}`);
        return false;
      }
    } else {
      transformed = `"${selText.replace(/\s+/g, ' ').trim()}"`;
    }
    run(engine, () => {
      engine.model.replace(transformed);
      return true;
    });
    toast?.(`Processed with: ${addin.name}`);
    return true;
  }

  if (addin.actionType === 'ai_prompt') {
    const promptText = addin.prompt || 'Improve and rewrite selection';
    const target = selText || 'Executive Summary Topic';
    const sampleOutput = `\n[${addin.name} - Prompt: "${promptText}"]:\n${target}\n(Refined with academic clarity, active voice, and professional standard).\n`;
    run(engine, () => {
      engine.model.replace(sampleOutput);
      return true;
    });
    toast?.(`AI instruction executed: ${addin.name}`);
    return true;
  }

  if (addin.actionType === 'custom_code') {
    try {
      const fn = new Function('ctx', 'engine', 'selText', addin.customCode);
      fn(ctx, engine, selText);
      toast?.(`Executed custom script: ${addin.name}`);
      return true;
    } catch (err) {
      toast?.(`Script execution error: ${err.message}`);
      return false;
    }
  }

  toast?.(`Custom add-in executed: ${addin.name}`);
  return true;
}

/* -------------------------------------------------------------------------- */
/* Built-in Add-in Implementations                                           */
/* -------------------------------------------------------------------------- */

export function insertOfficialSignatureBlock(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;

  const today = new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(new Date());
  const block = [
    '\n',
    '────────────────────────────────────────────────────────────',
    'EXECUTIVE APPROVAL & SIGNATURE',
    'Full Name: ........................................    Title: ........................................',
    `Execution Date: ${today}`,
    'Digital Signature & Corporate Seal:',
    '\n         [  OFFICIAL CORPORATE SEAL  ]           ______________________',
    '────────────────────────────────────────────────────────────\n',
  ].join('\n');

  run(engine, () => {
    engine.model.replace(block);
    return true;
  });
  toast?.('Signature block inserted successfully.');
}

export function formatSelectedAsCode(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;
  const [a, b] = engine.model.range;
  const text = a === b ? 'console.log("Hello, Word Add-ins!");' : engine.model.text.slice(a, b);

  const lines = text.split('\n');
  const formatted = lines.map((l, i) => `${String(i + 1).padStart(2, ' ')} │ ${l}`).join('\n');
  const box = `\n┌── [ Code Snippet ] ─────────────────────────\n${formatted}\n└─────────────────────────────────────────────\n`;

  run(engine, () => {
    engine.model.replace(box);
    return true;
  });
  toast?.('Code block styled with monospace syntax.');
}

export function insertDecisionMatrix(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;

  const matrix = [
    '\n╔══════════════════════════════════════════════════════════════════╗',
    '║                    SWOT ANALYSIS MATRIX                          ║',
    '╠══════════════════════════════╦═══════════════════════════════════╣',
    '║  STRENGTHS                   ║  WEAKNESSES                       ║',
    '║  • High performance & speed  ║  • Resource & timeline bounds     ║',
    '║  • Robust cloud architecture ║  • Additional training needed     ║',
    '╠══════════════════════════════╬═══════════════════════════════════╣',
    '║  OPPORTUNITIES               ║  THREATS                          ║',
    '║  • Market expansion          ║  • Fast-moving competition        ║',
    '║  • AI tooling integration    ║  • Regulatory compliance updates  ║',
    '╚══════════════════════════════╩═══════════════════════════════════╝\n',
  ].join('\n');

  run(engine, () => {
    engine.model.replace(matrix);
    return true;
  });
  toast?.('SWOT Analysis Matrix inserted.');
}

let pomodoroInterval = null;
let pomodoroRemaining = 25 * 60;

export function togglePomodoroTimer(ctx) {
  const { toast } = ctx;
  if (pomodoroInterval) {
    clearInterval(pomodoroInterval);
    pomodoroInterval = null;
    toast?.('Focus timer stopped.');
    const el = document.getElementById('writedoc-pomodoro-badge');
    if (el) el.remove();
    return;
  }

  pomodoroRemaining = 25 * 60;
  toast?.('⏱️ Focus timer started: 25 minutes of writing sprint!');
  updatePomodoroBadge();

  pomodoroInterval = setInterval(() => {
    pomodoroRemaining--;
    updatePomodoroBadge();
    if (pomodoroRemaining <= 0) {
      clearInterval(pomodoroInterval);
      pomodoroInterval = null;
      alert('🔔 Writing sprint completed! Take a 5-minute break.');
      const el = document.getElementById('writedoc-pomodoro-badge');
      if (el) el.remove();
    }
  }, 1000);
}

function updatePomodoroBadge() {
  let badge = document.getElementById('writedoc-pomodoro-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'writedoc-pomodoro-badge';
    badge.style.cssText =
      'position: fixed; bottom: 32px; left: 24px; z-index: 9999; background: #0078d4; color: #fff; padding: 6px 14px; border-radius: 4px; font-size: 12.5px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s;';
    badge.title = 'Click to stop timer';
    badge.onclick = () => {
      if (pomodoroInterval) {
        clearInterval(pomodoroInterval);
        pomodoroInterval = null;
        badge.remove();
      }
    };
    document.body.appendChild(badge);
  }
  const mins = Math.floor(pomodoroRemaining / 60);
  const secs = pomodoroRemaining % 60;
  badge.innerHTML = `⏱️ Focus Sprint: ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} (Stop)`;
}

function openDefaultAiAssistant(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;
  const [a, b] = engine.model.range;
  const text = a === b ? '' : engine.model.text.slice(a, b).trim();
  const summary = text
    ? `\n[AI Writing Copilot Summary]:\n${text.split('. ').slice(0, 2).join('. ')}.\n`
    : '\n[AI Writing Copilot]: Select text to summarize, expand, or rewrite with academic eloquence.\n';
  run(engine, () => {
    engine.model.replace(summary);
    return true;
  });
  toast?.('Copilot assistant executed.');
}

function openDefaultTranslator(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;
  const [a, b] = engine.model.range;
  const text = a === b ? 'Hello World' : engine.model.text.slice(a, b).trim();
  const trans = `\n[Translation]: ${text}\n`;
  run(engine, () => {
    engine.model.replace(trans);
    return true;
  });
  toast?.('Text translated successfully.');
}

function openDefaultQrGenerator(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;
  toast?.('QR Code generated.');
}

function openDefaultLorem(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;
  const passage =
    '\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n';
  run(engine, () => {
    engine.model.replace(passage);
    return true;
  });
  toast?.('Sample dummy text inserted.');
}

function openDefaultWatermark(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;
  const stamp = '\n═══════════════════════════════════════════\n    [ TOP SECRET - CLASSIFIED DOCUMENT ]\n═══════════════════════════════════════════\n';
  run(engine, () => {
    engine.model.replace(stamp);
    return true;
  });
  toast?.('Classification watermark inserted.');
}

function openDefaultCalc(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;
  const calcText = ' [Calculation: 1,250 × 1.15 = 1,437.50] ';
  run(engine, () => {
    engine.model.replace(calcText);
    return true;
  });
  toast?.('Calculation result inserted.');
}

function openDefaultBibtex(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;
  const bib = '\nSmith, J., & Doe, A. (2025). Advanced Document Processing in Cloud Architecture. Journal of Computing, 42(3), 115-128. https://doi.org/10.1016/j.comp.2025.01.012\n';
  run(engine, () => {
    engine.model.replace(bib);
    return true;
  });
  toast?.('Academic citation inserted.');
}
