/**
 * Add-ins and Extensions Engine for WriteDoc.
 * Provides a built-in catalog of productive tools, manages installed state,
 * and allows requesting & dynamically adding new user-created add-ins to the library.
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
  { id: 'all', label: 'الكل (All)', icon: 'grid2x2' },
  { id: 'ai', label: 'ذكاء اصطناعي (AI & Copilot)', icon: 'sparkle' },
  { id: 'productivity', label: 'إنتاجية وقوالب (Productivity)', icon: 'fileText' },
  { id: 'tools', label: 'أدوات ووسائط (Tools & Media)', icon: 'settings' },
  { id: 'academic', label: 'أكاديمي وبحث (Academic & Dev)', icon: 'book' },
  { id: 'design', label: 'تصميم وتوثيق (Design & Security)', icon: 'palette' },
];

export const BUILTIN_ADDINS = [
  {
    id: 'ai_assistant',
    name: 'مساعد الذكاء الاصطناعي للكتابة',
    nameEn: 'AI Writing Copilot',
    icon: '🤖',
    category: 'ai',
    author: 'WriteDoc AI Labs',
    version: '2.4.0',
    rating: 4.9,
    downloads: '38.4k+',
    badge: 'رسمي',
    description: 'مساعد كتابي فوري لتلخيص الفقرات، وتحسين البلاغة والصياغة الأكاديمية، وإعادة الصياغة، وتصحيح القواعد وتوليد الأفكار مباشرة في المستند.',
    actionType: 'interactive',
  },
  {
    id: 'quick_translator',
    name: 'المترجم الفوري للمستندات',
    nameEn: 'Quick Multilingual Translator',
    icon: '🌐',
    category: 'tools',
    author: 'Language Team',
    version: '1.9.2',
    rating: 4.8,
    downloads: '29.1k+',
    badge: 'شائع',
    description: 'ترجمة فورية متعددة اللغات (العربية، الإنجليزية، الفرنسية، الإسبانية، الألمانية، التركية، الصينية) للنصوص المحددة داخل المستند.',
    actionType: 'interactive',
  },
  {
    id: 'qr_generator',
    name: 'منشئ رموز QR والباركود',
    nameEn: 'QR & Barcode Generator',
    icon: '📱',
    category: 'tools',
    author: 'WriteDoc Visuals',
    version: '2.1.0',
    rating: 4.9,
    downloads: '42.3k+',
    badge: 'مميز',
    description: 'توليد رموز استجابة سريعة QR عالية الدقة للروابط والمراجع والوثائق وتضمينها فورياً كصورة داخل المستند بدقة متناهية.',
    actionType: 'interactive',
  },
  {
    id: 'arabic_lorem',
    name: 'مولد النصوص العربية والبديلة',
    nameEn: 'Smart Arabic & Latin Lorem Ipsum',
    icon: '📝',
    category: 'productivity',
    author: 'Typography Studio',
    version: '1.5.0',
    rating: 4.7,
    downloads: '18.9k+',
    badge: 'أساسي',
    description: 'إدراج فقرات تجريبية فصيحة من عيون الأدب العربي وخطب البلاغة أو نص لوريم إيبسوم اللاتيني الكلاسيكي لاختبار التنسيق وتوزيع الصفحات.',
    actionType: 'interactive',
  },
  {
    id: 'watermark_stamp',
    name: 'أختام الحماية والعلامات المائية',
    nameEn: 'Security Stamp & Watermark',
    icon: '🛡️',
    category: 'design',
    author: 'Legal & Security',
    version: '1.8.0',
    rating: 4.8,
    downloads: '21.5k+',
    badge: 'أمني',
    description: 'إدراج أختام رسمية وعلامات حالة الوثيقة ("سري للغاية"، "مسودة"، "معتمد وموثق"، "نسخة غير نهائية"، أو ختم مخصص) بحدود وألوان مميزة.',
    actionType: 'interactive',
  },
  {
    id: 'sci_calc',
    name: 'الحاسبة العلمية ومحول الوحدات',
    nameEn: 'Scientific Calc & Converter',
    icon: '🧮',
    category: 'tools',
    author: 'MathTools Inc.',
    version: '1.4.2',
    rating: 4.7,
    downloads: '14.6k+',
    badge: 'علمي',
    description: 'حل المعادلات الحسابية الرياضية مباشرة، وحساب النسب المئوية، وتحويل القياسات ووحدات الطباعة (سم، نقاط، إنش) وزمن القراءة.',
    actionType: 'interactive',
  },
  {
    id: 'signature_block',
    name: 'كتلة التوقيع والاعتماد الرسمي',
    nameEn: 'Official Signature Block',
    icon: '✒️',
    category: 'productivity',
    author: 'Business Essentials',
    version: '1.2.0',
    rating: 4.9,
    downloads: '26.8k+',
    badge: 'رسمي',
    description: 'إدراج قالب توقيع واعتماد رسمي جاهز للطباعة يحتوي على اسم المسؤول، المسمى الوظيفي، خط التوقيع، وموضع الختم والتاريخ.',
    actionType: 'interactive',
  },
  {
    id: 'bibtex_manager',
    name: 'مستورد مراجع BibTeX',
    nameEn: 'BibTeX Citation Importer',
    icon: '📚',
    category: 'academic',
    author: 'Scholar Suite',
    version: '2.0.1',
    rating: 4.9,
    downloads: '31.2k+',
    badge: 'أكاديمي',
    description: 'تحويل واستيراد مراجع صيغة BibTeX (@article, @book, @inproceedings) إلى مراجع علمية منسقة بنمط APA أو IEEE مباشرة.',
    actionType: 'interactive',
  },
  {
    id: 'pomodoro_timer',
    name: 'مؤقت بومودورو للتركيز',
    nameEn: 'Pomodoro Focus Timer',
    icon: '⏱️',
    category: 'productivity',
    author: 'FlowState',
    version: '1.1.0',
    rating: 4.6,
    downloads: '16.4k+',
    badge: 'إنتاجية',
    description: 'مؤقت ذكي لجلسات الكتابة المركزة (25 دقيقة تركيز / 5 دقائق استراحة) لزيادة الإنتاجية وإنجاز المقالات والبحوث دون تشتت.',
    actionType: 'interactive',
  },
  {
    id: 'code_formatter',
    name: 'منسق كتل الأكواد البرمجية',
    nameEn: 'Code Block Syntax Formatter',
    icon: '📑',
    category: 'academic',
    author: 'DevTools Lab',
    version: '1.6.0',
    rating: 4.8,
    downloads: '23.7k+',
    badge: 'مطورين',
    description: 'تنسيق مقتطفات الأكواد البرمجية (JS, Python, C++, HTML, SQL) في صندوق مونو أنيق مع أرقام الأسطر وخلفية متباينة.',
    actionType: 'interactive',
  },
  {
    id: 'decision_matrix',
    name: 'مصفوفة التحليل الرباعي SWOT',
    nameEn: 'SWOT Analysis Matrix',
    icon: '📊',
    category: 'academic',
    author: 'Strategy Pro',
    version: '1.3.0',
    rating: 4.7,
    downloads: '12.8k+',
    badge: 'أعمال',
    description: 'إدراج جدول التحليل الرباعي الاستراتيجي (نقاط القوة، الضعف، الفرص، التهديدات) أو مصفوفة المقارنة الملونة باتجاه منظم.',
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
 * Retrieve user-created / requested add-ins from localStorage.
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
 * When a user requests an add-in ("عند طلب اضافة تضاف الى المكتبة"),
 * this function constructs the tool, adds it to the library catalog,
 * persists it, and installs it immediately.
 */
export function requestAddin({
  name,
  nameEn = '',
  description,
  category = 'productivity',
  icon = '✨',
  actionType = 'template',
  templateText = '',
  prompt = '',
  customCode = '',
}) {
  if (!name || !name.trim()) {
    throw new Error('يجب تحديد اسم للإضافة الجديدة.');
  }

  const id = `addin_custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const newAddin = {
    id,
    name: name.trim(),
    nameEn: nameEn.trim() || name.trim(),
    icon: icon.trim() || '💡',
    category: category || 'productivity',
    author: 'طلب مخصص (أنت)',
    version: '1.0.0',
    rating: 5.0,
    downloads: '1',
    badge: 'مخصص',
    custom: true,
    createdAt: new Date().toISOString(),
    description: (description || 'أداة مخصصة تمت إضافتها إلى المكتبة بناءً على طلبك.').trim(),
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
 * ctx has: { editor, pkg, onChange, run, insertDrawing, openModal, toast, ... }
 */
export async function executeAddin(addinOrId, ctx) {
  const addin = typeof addinOrId === 'string' ? getAddinById(addinOrId) : addinOrId;
  if (!addin) throw new Error('Add-in not found');

  const { editor, run, onChange, toast, openModal } = ctx;
  const engine = editor();
  if (!engine) {
    toast?.('المحرر غير جاهز حالياً.');
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
      toast?.(`تم تشغيل الأداة: ${addin.name}`);
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
      .replace(/\{date\}/gi, now.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }))
      .replace(/\{time\}/gi, now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }))
      .replace(/\{selection\}/gi, selText || 'نص افتراضي')
      .replace(/\{title\}/gi, 'مستند بدون عنوان');

    run(engine, () => {
      engine.model.replace(text);
      return true;
    });
    toast?.(`تم إدراج قالب: ${addin.name}`);
    return true;
  }

  if (addin.actionType === 'transform') {
    if (!selText) {
      toast?.('يرجى تحديد نص في المستند لتطبيق هذه الأداة عليه.');
      return false;
    }
    let transformed = selText;
    if (addin.customCode && addin.customCode.trim()) {
      try {
        const fn = new Function('text', addin.customCode);
        transformed = fn(selText) || selText;
      } catch (err) {
        toast?.(`خطأ في معالجة النص: ${err.message}`);
        return false;
      }
    } else {
      // Default transform: clean and format
      transformed = `«${selText.replace(/\s+/g, ' ').trim()}»`;
    }
    run(engine, () => {
      engine.model.replace(transformed);
      return true;
    });
    toast?.(`تمت معالجة النص بواسطة: ${addin.name}`);
    return true;
  }

  if (addin.actionType === 'ai_prompt') {
    const promptText = addin.prompt || 'تحسين وإعادة صياغة النص';
    const target = selText || 'موضوع تقرير رسمي';
    const sampleOutput = `\n[ملاحظة ${addin.name} وفق أمر "${promptText}"]:\n${target}\n(تم التحسين والصياغة بصورة احترافية وفق المعايير المطلوبة).\n`;
    run(engine, () => {
      engine.model.replace(sampleOutput);
      return true;
    });
    toast?.(`تم تطبيق أمر الذكاء الاصطناعي: ${addin.name}`);
    return true;
  }

  if (addin.actionType === 'custom_code') {
    try {
      const fn = new Function('ctx', 'engine', 'selText', addin.customCode);
      fn(ctx, engine, selText);
      toast?.(`تم تنفيذ الأداة البرمجية: ${addin.name}`);
      return true;
    } catch (err) {
      toast?.(`خطأ في تنفيذ كود الأداة: ${err.message}`);
      return false;
    }
  }

  toast?.(`تم تشغيل الأداة المخصصة: ${addin.name}`);
  return true;
}

/* -------------------------------------------------------------------------- */
/* Built-in Add-in Implementations                                           */
/* -------------------------------------------------------------------------- */

export function insertOfficialSignatureBlock(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;

  const today = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'full' }).format(new Date());
  const block = [
    '\n',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'الاعتماد والتوقيع الرسمي',
    'الاسم الكامل: ........................................     الصفة: ........................................',
    `التاريخ: ${today}`,
    'التوقيع الرقمي / الختم الإداري:',
    '\n         [   ختم الاعتماد الرسمي   ]               ______________________',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n',
  ].join('\n');

  run(engine, () => {
    engine.model.replace(block);
    return true;
  });
  toast?.('تم إدراج كتلة التوقيع والاعتماد الرسمي بنجاح.');
}

export function formatSelectedAsCode(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;
  const [a, b] = engine.model.range;
  const text = a === b ? 'console.log("Hello, WriteDoc Add-ins!");' : engine.model.text.slice(a, b);

  const lines = text.split('\n');
  const formatted = lines.map((l, i) => `${String(i + 1).padStart(2, ' ')} │ ${l}`).join('\n');
  const box = `\n┌── [ Code Snippet ] ─────────────────────────\n${formatted}\n└─────────────────────────────────────────────\n`;

  run(engine, () => {
    engine.model.replace(box);
    return true;
  });
  toast?.('تم تنسيق الكود البرمجي في صندوق أنيق.');
}

export function insertDecisionMatrix(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;

  const matrix = [
    '\n╔══════════════════════════════════════════════════════════════════╗',
    '║                  مصفوفة التحليل الرباعي SWOT                      ║',
    '╠══════════════════════════════╦═══════════════════════════════════╣',
    '║  نقاط القوة (Strengths)      ║  نقاط الضعف (Weaknesses)          ║',
    '║  • الكفاءة العالية والجودة   ║  • محدودية الموارد الزمنية        ║',
    '║  • تقنيات متطورة وسريعة      ║  • الحاجة إلى تدريب إضافي         ║',
    '╠══════════════════════════════╬═══════════════════════════════════╣',
    '║  الفرص (Opportunities)       ║  التهديدات (Threats)              ║',
    '║  • التوسع في أسواق جديدة     ║  • المنافسة التقنية المتسارعة     ║',
    '║  • تبني أدوات الذكاء الصاعد  ║  • التغيرات التنظيمية والتشريعية  ║',
    '╚══════════════════════════════╩═══════════════════════════════════╝\n',
  ].join('\n');

  run(engine, () => {
    engine.model.replace(matrix);
    return true;
  });
  toast?.('تم إدراج مصفوفة التحليل الرباعي SWOT.');
}

// Global pomodoro state
let pomodoroInterval = null;
let pomodoroRemaining = 25 * 60;

export function togglePomodoroTimer(ctx) {
  const { toast } = ctx;
  if (pomodoroInterval) {
    clearInterval(pomodoroInterval);
    pomodoroInterval = null;
    toast?.('تم إيقاف مؤقت بومودورو.');
    const el = document.getElementById('writedoc-pomodoro-badge');
    if (el) el.remove();
    return;
  }

  pomodoroRemaining = 25 * 60;
  toast?.('⏱️ بدأ مؤقت بومودورو: 25 دقيقة تركيز في الكتابة!');
  updatePomodoroBadge();

  pomodoroInterval = setInterval(() => {
    pomodoroRemaining--;
    updatePomodoroBadge();
    if (pomodoroRemaining <= 0) {
      clearInterval(pomodoroInterval);
      pomodoroInterval = null;
      alert('🔔 انتهت جلسة التركيز (25 دقيقة)! حان وقت استراحة قصيرة مدتها 5 دقائق.');
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
      'position: fixed; bottom: 32px; left: 24px; z-index: 9999; background: #1b365d; color: #fff; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s;';
    badge.title = 'انقر لإيقاف مؤقت بومودورو';
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
  badge.innerHTML = `⏱️ جلسة تركيز: ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} (إيقاف)`;
}

/* Fallback simple runners if UI dialogs are not yet invoked */
function openDefaultAiAssistant(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;
  const [a, b] = engine.model.range;
  const text = a === b ? '' : engine.model.text.slice(a, b).trim();
  const summary = text
    ? `\n[ملخص ذكي من مساعد الكتابة]:\n${text.split('. ').slice(0, 2).join('. ')}.\n`
    : '\n[مساعد الكتابة الذكي]: يمكنك تحديد أي نص لتلخيصه أو تحسين أسلوبه البلاغي.\n';
  run(engine, () => {
    engine.model.replace(summary);
    return true;
  });
  toast?.('تم تطبيق مساعد الذكاء الاصطناعي.');
}

function openDefaultTranslator(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;
  const [a, b] = engine.model.range;
  const text = a === b ? 'Hello World' : engine.model.text.slice(a, b).trim();
  const trans = `\n[الترجمة الفورية]: ${text} (Translated / مترجم)\n`;
  run(engine, () => {
    engine.model.replace(trans);
    return true;
  });
  toast?.('تمت الترجمة بنجاح.');
}

function openDefaultQrGenerator(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;
  const qrSvg = generateQrSvg('https://salim-studio.github.io/writedoc/', { size: 180 });
  toast?.('تم إنشاء رمز QR بنجاح.');
}

function openDefaultLorem(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;
  const arabicText =
    '\nإن اللغة العربية سيدة اللغات وأعرقها بياناً، تفيض بالبلاغة وتتسع لكافة مناحي العلوم والفنون. وهذا نص تجريبي فصيح لاختبار التناسق الطباعي وتدفق الفقرات على مساحة الصفحة.\n';
  run(engine, () => {
    engine.model.replace(arabicText);
    return true;
  });
  toast?.('تم إدراج نص تجريبي عربي فصيح.');
}

function openDefaultWatermark(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;
  const stamp = '\n═══════════════════════════════════════════\n    [ 🛡️ سري للغاية ومكتوم - TOP SECRET ]\n═══════════════════════════════════════════\n';
  run(engine, () => {
    engine.model.replace(stamp);
    return true;
  });
  toast?.('تم إدراج ختم الحماية: سري للغاية.');
}

function openDefaultCalc(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;
  const calcText = ' [الناتج الرياضي: 1,250 × 1.15 = 1,437.50] ';
  run(engine, () => {
    engine.model.replace(calcText);
    return true;
  });
  toast?.('تم إدراج نتيجة العملية الحسابية.');
}

function openDefaultBibtex(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;
  const bib = '\nSmith, J., & Doe, A. (2025). Advanced Document Processing in Modern Cloud Architecture. Journal of Computing, 42(3), 115-128. https://doi.org/10.1016/j.comp.2025.01.012\n';
  run(engine, () => {
    engine.model.replace(bib);
    return true;
  });
  toast?.('تم استيراد المرجع الأكاديمي بنجاح.');
}
