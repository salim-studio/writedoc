import { el, MOD_KEY } from './dom.js';
import { iconEl } from './icons.js';
import { commandIconEl } from './ribbon.js';
import { localStore } from '../lib/storage.js';

const DECK_STORE_KEY = 'writedoc:deck-active-tab';
const DECK_OPEN_KEY = 'writedoc:deck-open';

export const DECK_TABS = [
  { id: 'properties', label: 'الخصائص (Properties)', icon: 'pencil', desc: 'تنسيق النصوص والفقرات والجداول' },
  { id: 'page', label: 'الصفحة (Page Setup)', icon: 'pageSettings', desc: 'حجم الصفحة والهوامش والاتجاه' },
  { id: 'styles', label: 'الأنماط (Styles)', icon: 'palette', desc: 'معرض الأنماط والتنسيقات السريعة' },
  { id: 'navigator', label: 'المستكشف (Navigator)', icon: 'outline', desc: 'مستكشف العناوين وبنية المستند' },
  { id: 'tools', label: 'أدوات وLaTeX (Tools)', icon: 'sparkle', desc: 'معادلات LaTeX والبحث في المراجع والمصادر' },
];

/**
 * Authentic LibreOffice Writer Right Sidebar ("The Deck")
 * Features a vertical tabstrip along the right edge with 5 iconic decks:
 * 1. Properties: Text, Paragraph, and Table direct formatting
 * 2. Page: Paper size, Orientation, Margins, Header/Footer
 * 3. Styles: Live style gallery with one-click application
 * 4. Navigator: Live document outline tree & statistics
 * 5. Tools & LaTeX: Instant LaTeX equation palette, OCR & worldwide citation lookup
 */
export function createLibreDeck({ c, w = {}, a = {}, focusEditor }) {
  let activeTab = readDeckTab();
  let isOpen = readDeckOpen();

  const tabStrip = el('div.libre-deck-tabstrip', { role: 'tablist', 'aria-label': 'LibreOffice Deck Tabs' });
  const deckTitle = el('span.libre-deck-title', {}, 'الخصائص');
  const collapseBtn = el('button.libre-deck-close-btn', {
    type: 'button',
    'aria-label': 'طي الشريط الجانبي',
    title: 'طي الشريط الجانبي (Collapse)',
    onclick: () => setOpen(false),
  }, iconEl('x', 16));

  const deckHeader = el('div.libre-deck-header', {}, deckTitle, collapseBtn);
  const deckBody = el('div.libre-deck-body');
  const deckPanel = el('div.libre-deck-panel', {}, deckHeader, deckBody);

  // Toggle tab / bar on divider
  const edgeToggle = el('button.libre-deck-edge-toggle', {
    type: 'button',
    'aria-label': 'تبديل الشريط الجانبي',
    title: 'تبديل الشريط الجانبي (LibreOffice Deck)',
    onclick: () => setOpen(!isOpen),
  }, el('span.libre-deck-edge-arrow', { 'aria-hidden': 'true' }));

  const root = el('aside.libre-deck-container.canvas-inspector', {
    id: 'libre-sidebar-deck',
    'aria-label': 'LibreOffice Sidebar Deck',
  }, edgeToggle, deckPanel, tabStrip);

  // Build Tabstrip buttons
  const tabButtons = new Map();
  for (const tab of DECK_TABS) {
    const btn = el('button.libre-deck-tab-btn', {
      type: 'button',
      role: 'tab',
      id: `deck-tab-${tab.id}`,
      'aria-selected': String(tab.id === activeTab),
      'aria-label': tab.label,
      title: `${tab.label} — ${tab.desc}`,
      onclick: () => {
        if (isOpen && activeTab === tab.id) {
          setOpen(false);
        } else {
          selectTab(tab.id);
          if (!isOpen) setOpen(true);
        }
      },
    }, iconEl(tab.icon, 18), el('span.libre-deck-tab-name', {}, tab.label.split(' ')[0]));
    tabStrip.append(btn);
    tabButtons.set(tab.id, btn);
  }

  function readDeckTab() {
    try {
      const saved = localStore()?.getItem(DECK_STORE_KEY);
      if (saved && DECK_TABS.some(t => t.id === saved)) return saved;
    } catch { /* storage fallback */ }
    return 'properties';
  }

  function readDeckOpen() {
    try {
      const saved = localStore()?.getItem(DECK_OPEN_KEY);
      if (saved !== null) return saved === 'true';
    } catch { /* storage fallback */ }
    return true; // open by default in hybrid mode
  }

  function setOpen(value) {
    isOpen = value;
    try { localStore()?.setItem(DECK_OPEN_KEY, String(value)); } catch { /* ignore */ }
    root.classList.toggle('is-collapsed', !isOpen);
    edgeToggle.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) {
      renderActiveTab();
    }
  }

  function selectTab(id) {
    activeTab = id;
    try { localStore()?.setItem(DECK_STORE_KEY, id); } catch { /* ignore */ }
    for (const [tabId, btn] of tabButtons.entries()) {
      btn.setAttribute('aria-selected', String(tabId === id));
      btn.classList.toggle('is-active', tabId === id);
    }
    const tabObj = DECK_TABS.find(t => t.id === id);
    if (tabObj) deckTitle.textContent = tabObj.label;
    renderActiveTab();
  }

  // --- Decks Rendering ---
  function renderActiveTab() {
    deckBody.replaceChildren();
    switch (activeTab) {
      case 'properties':
        renderPropertiesDeck();
        break;
      case 'page':
        renderPageDeck();
        break;
      case 'styles':
        renderStylesDeck();
        break;
      case 'navigator':
        renderNavigatorDeck();
        break;
      case 'tools':
        renderToolsDeck();
        break;
    }
  }

  /* ---- 1. Properties Deck ---- */
  function renderPropertiesDeck() {
    const wrap = el('div.libre-deck-content.properties-content');

    // Section A: Character
    const charSec = el('div.libre-deck-section', {},
      el('div.libre-deck-sec-title', {}, 'الخط والحرف (Character)'),
      el('div.libre-deck-grid', {},
        el('div.libre-prop-row', {},
          el('label.libre-field-wrap.flex-1', {}, el('span.libre-field-lbl', {}, 'نوع الخط'), c.fontFamily),
          el('label.libre-field-wrap.size-wrap', {}, el('span.libre-field-lbl', {}, 'الحجم'), c.fontSize)
        ),
        el('div.libre-prop-row.tools-row', {},
          wrapBtn(c.bold, 'عريض Bold'),
          wrapBtn(c.italic, 'مائل Italic'),
          wrapBtn(c.underline, 'تسطير Underline'),
          wrapBtn(c.strike, 'يتوسطه خط Strikethrough'),
          wrapBtn(c.subscript, 'منخفض Subscript'),
          wrapBtn(c.superscript, 'مرتفع Superscript')
        ),
        el('div.libre-prop-row.colors-row', {},
          el('div.libre-color-box', {}, el('span.libre-mini-lbl', {}, 'لون النص'), c.textColor),
          el('div.libre-color-box', {}, el('span.libre-mini-lbl', {}, 'التمييز'), c.highlight),
          wrapBtn(c.clearTextFormatting, 'مسح التنسيق')
        )
      )
    );

    // Section B: Paragraph
    const paraSec = el('div.libre-deck-section', {},
      el('div.libre-deck-sec-title', {}, 'الفقرة والمحاذاة (Paragraph)'),
      el('div.libre-deck-grid', {},
        el('div.libre-prop-row.tools-row', {},
          ...c.alignmentButtons.map((btn, i) => {
            const labels = ['محاذاة لليمين', 'توسيط', 'محاذاة لليسار', 'ضبط كلي'];
            return wrapBtn(btn, labels[i] || 'محاذاة');
          })
        ),
        el('div.libre-prop-row.tools-row', {},
          wrapBtn(c.bullets, 'تعداد نقطي'),
          wrapBtn(c.numbers, 'تعداد رقمي'),
          wrapBtn(c.outdent, 'إنقاص المسافة البادئة'),
          wrapBtn(c.indent, 'زيادة المسافة البادئة')
        ),
        el('div.libre-prop-row', {},
          el('label.libre-field-wrap.flex-1', {}, el('span.libre-field-lbl', {}, 'تباعد الأسطر'), c.lineSpacing),
          w.paragraphDialog ? el('button.btn.btn-sm.libre-sub-btn', {
            type: 'button',
            onclick: () => w.paragraphDialog(),
          }, 'خيارات الفقرة…') : null
        )
      )
    );

    // Section C: Quick Table Actions
    const tableSec = el('div.libre-deck-section', {},
      el('div.libre-deck-sec-title', {}, 'الجدول السريع (Table)'),
      el('div.libre-prop-row', {},
        el('label.libre-field-wrap.flex-1', {}, el('span.libre-field-lbl', {}, 'عمليات الجدول'), c.tableActions)
      )
    );

    wrap.append(charSec, paraSec, tableSec);
    deckBody.append(wrap);
  }

  function wrapBtn(btn, title) {
    if (!btn) return null;
    if (title && !btn.title) btn.title = title;
    return btn;
  }

  /* ---- 2. Page Deck ---- */
  function renderPageDeck() {
    const wrap = el('div.libre-deck-content.page-content');

    // Page formats
    const paperSelect = el('select.input.libre-select', {
      'aria-label': 'حجم الورق',
      onchange: () => applyPaperSize(paperSelect.value),
    },
      el('option', { value: 'a4' }, 'A4 (210 × 297 مم)'),
      el('option', { value: 'letter' }, 'Letter (8.5 × 11 بوصة)'),
      el('option', { value: 'legal' }, 'Legal (8.5 × 14 بوصة)'),
      el('option', { value: 'a3' }, 'A3 (297 × 420 مم)'),
      el('option', { value: 'a5' }, 'A5 (148 × 210 مم)')
    );

    // Orientation choices
    const orientPortrait = el('button.btn.btn-sm.libre-toggle-btn.is-active', {
      type: 'button',
      onclick: () => applyOrientation('portrait'),
    }, iconEl('brand', 16), el('span', {}, 'عمودي Portrait'));

    const orientLandscape = el('button.btn.btn-sm.libre-toggle-btn', {
      type: 'button',
      onclick: () => applyOrientation('landscape'),
    }, iconEl('fitWidth', 16), el('span', {}, 'أفقي Landscape'));

    // Margins
    const marginsSelect = el('select.input.libre-select', {
      'aria-label': 'هوامش الصفحة',
      onchange: () => applyMargins(marginsSelect.value),
    },
      el('option', { value: 'normal' }, 'عادية Normal (1 بوصة - 2.54 سم)'),
      el('option', { value: 'narrow' }, 'ضيقة Narrow (0.5 بوصة - 1.27 سم)'),
      el('option', { value: 'moderate' }, 'متوسطة Moderate (1×0.75 بوصة)'),
      el('option', { value: 'wide' }, 'عريضة Wide (2 بوصة - 5.08 سم)')
    );

    const pageSec = el('div.libre-deck-section', {},
      el('div.libre-deck-sec-title', {}, 'تنسيق الصفحة (Page Format)'),
      el('div.libre-deck-grid', {},
        el('label.libre-field-wrap', {}, el('span.libre-field-lbl', {}, 'حجم الورق'), paperSelect),
        el('div.libre-field-wrap', {},
          el('span.libre-field-lbl', {}, 'اتجاه الصفحة'),
          el('div.libre-btn-group', {}, orientPortrait, orientLandscape)
        ),
        el('label.libre-field-wrap', {}, el('span.libre-field-lbl', {}, 'الهوامش'), marginsSelect)
      )
    );

    const toolsSec = el('div.libre-deck-section', {},
      el('div.libre-deck-sec-title', {}, 'فواصل وترقيم (Breaks & Numbers)'),
      el('div.libre-quick-grid', {},
        el('button.btn.btn-sm.libre-action-btn', {
          type: 'button',
          onclick: () => { c.pageBreak?.click(); focusEditor?.(); },
        }, iconEl('insertPageBreak', 16), el('span', {}, 'إدراج فاصل صفحات')),
        el('button.btn.btn-sm.libre-action-btn', {
          type: 'button',
          onclick: () => { c.pageBreakBefore?.click(); focusEditor?.(); },
        }, iconEl('pageBreak', 16), el('span', {}, 'فاصل قبل الفقرة')),
        el('button.btn.btn-sm.libre-action-btn', {
          type: 'button',
          onclick: () => { c.pageSetup?.click(); },
        }, iconEl('settings', 16), el('span', {}, 'إعداد الصفحة المتقدم…'))
      )
    );

    wrap.append(pageSec, toolsSec);
    deckBody.append(wrap);
  }

  function applyOrientation(val) {
    if (w.orientationItems) {
      const items = w.orientationItems();
      const match = items.find(i => i.picture === val || i.label?.toLowerCase()?.includes(val));
      if (match?.onSelect) match.onSelect();
    } else if (c.pageSetup) {
      c.pageSetup.click();
    }
  }

  function applyPaperSize(val) {
    if (w.paperSizeItems) {
      const items = w.paperSizeItems();
      const match = items.find(i => i.label?.toLowerCase()?.includes(val));
      if (match?.onSelect) match.onSelect();
    }
  }

  function applyMargins(val) {
    if (w.marginItems) {
      const items = w.marginItems();
      const match = items.find(i => i.label?.toLowerCase()?.includes(val));
      if (match?.onSelect) match.onSelect();
    }
  }

  /* ---- 3. Styles Deck ---- */
  function renderStylesDeck() {
    const wrap = el('div.libre-deck-content.styles-content');

    const STYLES_LIST = [
      { id: 'Normal', label: 'عادي (Normal)', tag: 'p', fontStyle: 'font-size: 13px;' },
      { id: 'Heading 1', label: 'عنوان رئيسي 1 (Heading 1)', tag: 'h1', fontStyle: 'font-size: 16px; font-weight: 700; color: #185abd;' },
      { id: 'Heading 2', label: 'عنوان فرعي 2 (Heading 2)', tag: 'h2', fontStyle: 'font-size: 15px; font-weight: 600; color: #107c41;' },
      { id: 'Heading 3', label: 'عنوان جانبي 3 (Heading 3)', tag: 'h3', fontStyle: 'font-size: 14px; font-weight: 600;' },
      { id: 'Title', label: 'عنوان المستند (Title)', tag: 'h1', fontStyle: 'font-size: 18px; font-weight: 800;' },
      { id: 'Subtitle', label: 'العنوان الثانوي (Subtitle)', tag: 'p', fontStyle: 'font-size: 13px; color: #666; font-style: italic;' },
      { id: 'Quote', label: 'اقتباس مائل (Quote)', tag: 'blockquote', fontStyle: 'font-size: 13px; font-style: italic; border-right: 3px solid #107c41; padding-right: 6px;' },
      { id: 'Code', label: 'كود / نص تقني (Code)', tag: 'pre', fontStyle: 'font-size: 12px; font-family: monospace; background: #eee; padding: 2px 4px;' },
    ];

    const currentStyle = c.paragraphStyle?.value || 'Normal';

    const items = STYLES_LIST.map(st => {
      const isSelected = currentStyle === st.id;
      return el('button.libre-style-card', {
        type: 'button',
        'aria-selected': String(isSelected),
        onclick: () => {
          if (c.paragraphStyle) {
            c.paragraphStyle.value = st.id;
            c.paragraphStyle.dispatchEvent(new Event('change', { bubbles: true }));
            focusEditor?.();
            renderStylesDeck();
          }
        },
      },
        el('div.libre-style-sample', { style: st.fontStyle }, st.label),
        el('span.libre-style-badge', {}, st.id)
      );
    });

    const styleActions = el('div.libre-deck-section', {},
      el('div.libre-deck-sec-title', {}, 'معرض الأنماط (Style Gallery)'),
      el('div.libre-styles-grid', {}, ...items),
      el('div.libre-prop-row.mt-8', {},
        c.editStyle ? wrapBtn(c.editStyle, 'تعديل النمط الحالي') : null,
        c.newStyle ? wrapBtn(c.newStyle, 'نمط جديد…') : null,
        c.clearParagraphFormatting ? wrapBtn(c.clearParagraphFormatting, 'إلغاء التنسيق') : null
      )
    );

    wrap.append(styleActions);
    deckBody.append(wrap);
  }

  /* ---- 4. Navigator Deck ---- */
  function renderNavigatorDeck() {
    const wrap = el('div.libre-deck-content.navigator-content');

    const engine = a.engine?.();
    const pageCount = engine?.layout?.pageCount || 1;
    const bodyText = engine?.session?.body?.text || engine?.model?.text || '';
    const wordCount = bodyText.trim() ? bodyText.trim().split(/\s+/).length : 0;
    const charCount = bodyText.length;

    // Summary box
    const summaryBox = el('div.libre-nav-summary', {},
      el('div.libre-nav-stat', {}, el('span.stat-num', {}, String(pageCount)), el('span.stat-lbl', {}, 'صفحة')),
      el('div.libre-nav-stat', {}, el('span.stat-num', {}, String(wordCount)), el('span.stat-lbl', {}, 'كلمة')),
      el('div.libre-nav-stat', {}, el('span.stat-num', {}, String(charCount)), el('span.stat-lbl', {}, 'حرف'))
    );

    // Extract headings from model
    const headings = extractHeadings(engine);

    const headingsList = el('div.libre-nav-tree');
    if (!headings.length) {
      headingsList.append(
        el('p.libre-empty-hint', {}, 'لا توجد عناوين في المستند حالياً. قم بتطبيق أنماط "عنوان 1" أو "عنوان 2" على الفقرات لظهورها في شجرة المستكشف.')
      );
    } else {
      for (const h of headings) {
        const item = el('button.libre-nav-item', {
          type: 'button',
          style: { paddingRight: `${8 + (h.level - 1) * 12}px` },
          title: `انتقل إلى: ${h.text}`,
          onclick: () => {
            if (h.pos !== undefined && engine?.model) {
              engine.model.select(h.pos, h.pos);
              engine.scrollSelectionIntoView?.();
              engine.focus();
            }
          },
        },
          el('span.libre-nav-icon', {}, iconEl('h' + Math.min(3, h.level), 14)),
          el('span.libre-nav-text', {}, h.text)
        );
        headingsList.append(item);
      }
    }

    const outlineSec = el('div.libre-deck-section', {},
      el('div.libre-deck-sec-title', {}, 'شجرة العناوين والمحتوى (Document Outline)'),
      summaryBox,
      headingsList
    );

    wrap.append(outlineSec);
    deckBody.append(wrap);
  }

  function extractHeadings(engine) {
    if (!engine) return [];
    const list = [];
    try {
      // Extract from paragraphs if available
      const paragraphs = engine.model?.paragraphs || engine.session?.body?.paragraphs || [];
      let offset = 0;
      for (const p of paragraphs) {
        const style = p.style || p.props?.style || '';
        const match = style.match(/Heading\s*([1-9])/i);
        const text = p.text || (p.runs ? p.runs.map(r => r.text || '').join('') : '');
        if (match && text.trim()) {
          list.push({
            level: parseInt(match[1], 10),
            text: text.trim().slice(0, 60),
            pos: offset,
          });
        }
        offset += (text.length || 0) + 1;
      }
    } catch (e) {
      console.warn('Error extracting headings:', e);
    }
    return list;
  }

  /* ---- 5. Tools & LaTeX Deck ---- */
  function renderToolsDeck() {
    const wrap = el('div.libre-deck-content.tools-content');

    // LaTeX Studio Launcher
    const latexBanner = el('div.libre-tool-card.latex-card', {},
      el('div.libre-card-header', {},
        el('div.libre-card-icon', {}, iconEl('sparkle', 20)),
        el('div.libre-card-text', {},
          el('h3', {}, 'محرر LaTeX والمعادلات'),
          el('p', {}, 'إدراج وصياغة المعادلات الرياضية والأكاديمية برموز LaTeX القياسية')
        )
      ),
      el('button.btn.btn-primary.btn-sm.w-full', {
        type: 'button',
        onclick: () => {
          if (w.latexDialog) w.latexDialog();
          else if (w.insertMath) w.insertMath();
        },
      }, 'فتح استوديو معادلات LaTeX 📐')
    );

    // Quick Formula Palettes
    const PRESETS = [
      { name: 'المعادلة التربيعية', code: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
      { name: 'مبرهنة فيثاغورس', code: 'a^2 + b^2 = c^2' },
      { name: 'التكامل المحدد', code: '\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)' },
      { name: 'المجموع المنتهي', code: '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}' },
      { name: 'مصفوفة 2×2', code: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
      { name: 'متطابقة أويلر', code: 'e^{i\\pi} + 1 = 0' },
      { name: 'نهاية الدالة', code: '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1' },
      { name: 'قانون أينشتاين', code: 'E = m c^2' },
    ];

    const presetButtons = PRESETS.map(p => el('button.libre-preset-btn', {
      type: 'button',
      title: `إدراج صيغة ${p.name}: ${p.code}`,
      onclick: () => {
        if (w.latexDialog) {
          w.latexDialog(p.code);
        } else if (w.insertMath) {
          w.insertMath(p.code);
        }
      },
    },
      el('span.libre-preset-name', {}, p.name),
      el('code.libre-preset-code', {}, p.code)
    ));

    const presetsSec = el('div.libre-deck-section', {},
      el('div.libre-deck-sec-title', {}, 'نماذج رياضية جاهزة (Quick Presets)'),
      el('div.libre-presets-grid', {}, ...presetButtons)
    );

    // Academic Research & OCR
    const ocrCard = el('div.libre-tool-card.ocr-card', {},
      el('div.libre-card-header', {},
        el('div.libre-card-icon', {}, iconEl('book', 20)),
        el('div.libre-card-text', {},
          el('h3', {}, 'البحث في المراجع وقواعد البيانات'),
          el('p', {}, 'تحويل الصور لنصوص والبحث في Scopus و Web of Science و PubMed و IEEE وغيرها')
        )
      ),
      el('button.btn.btn-sm.libre-sub-btn.w-full', {
        type: 'button',
        onclick: () => {
          if (w.ocrSourceDialog) w.ocrSourceDialog();
          else if (w.openReferences) w.openReferences();
        },
      }, '🔍 البحث الأكاديمي واستيراد المراجع')
    );

    // Quick helpers
    const helpersSec = el('div.libre-deck-section', {},
      el('div.libre-deck-sec-title', {}, 'أدوات مساعدة (Writing Helpers)'),
      el('div.libre-quick-grid', {},
        el('button.btn.btn-sm.libre-action-btn', {
          type: 'button',
          onclick: () => { w.toggleMarks?.(); focusEditor?.(); },
        }, iconEl('pilcrow', 16), el('span', {}, 'علامات التنسيق ¶')),
        el('button.btn.btn-sm.libre-action-btn', {
          type: 'button',
          onclick: () => { w.wordCount?.(); },
        }, iconEl('info', 16), el('span', {}, 'إحصائيات الكلمات')),
        el('button.btn.btn-sm.libre-action-btn', {
          type: 'button',
          onclick: () => { w.spelling?.(); },
        }, iconEl('spell', 16), el('span', {}, 'التدقيق الإملائي'))
      )
    );

    wrap.append(latexBanner, presetsSec, ocrCard, helpersSec);
    deckBody.append(wrap);
  }

  // Initial state setup
  setOpen(isOpen);
  selectTab(activeTab);

  return {
    el: root,
    selectTab,
    setOpen,
    toggle: () => setOpen(!isOpen),
    isOpen: () => isOpen,
    refresh: () => {
      if (isOpen) renderActiveTab();
    },
    destroy: () => {
      root.remove();
    },
  };
}
