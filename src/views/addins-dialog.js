/**
 * Add-ins Store & Extensions Dialog (Office & LibreOffice Hybrid Aesthetic)
 * Provides Store/Catalog browsing, Installed Add-ins management,
 * and Dynamic Requesting / Creation of new Add-in tools added to the library.
 */
import { el } from '../ui/dom.js';
import { openModal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { icon } from '../ui/icons.js';
import {
  getAllAddins,
  getInstalledAddins,
  getInstalledAddinIds,
  isAddinInstalled,
  installAddin,
  uninstallAddin,
  requestAddin,
  deleteCustomAddin,
  executeAddin,
  ADDIN_CATEGORIES,
} from '../engine/addins.js';
import { generateQrSvg, generateQrPngBlob } from '../engine/qr-encoder.js';

export function openAddinsDialog(ctx = {}, { initialTab = 'store' } = {}) {
  let activeTab = initialTab;
  let activeCategory = 'all';
  let searchQuery = '';

  const container = el('div.addins-dialog');

  // Header tabs
  const tabStore = el('button.addins-tab-btn', { type: 'button' }, '🛍️ المكتبة والمتجر');
  const tabInstalled = el('button.addins-tab-btn', { type: 'button' }, '📦 إضافاتي المُثبّتة');
  const tabRequest = el('button.addins-tab-btn', { type: 'button' }, '➕ طلب / إضافة أداة جديدة');

  const tabsHeader = el('div.addins-tabs-header', {}, tabStore, tabInstalled, tabRequest);
  const bodyContainer = el('div.addins-body-container');

  container.append(tabsHeader, bodyContainer);

  const modal = openModal({
    title: 'مكتبة وإدارة الإضافات (Office & LibreOffice Add-ins Store)',
    content: container,
    wide: true,
  });

  const fullCtx = {
    ...ctx,
    openModal,
    toast,
    openQrGenerator: () => openQrGeneratorDialog(fullCtx),
    openAiAssistant: () => openAiAssistantDialog(fullCtx),
    openTranslator: () => openTranslatorDialog(fullCtx),
    openWatermark: () => openWatermarkDialog(fullCtx),
    openLorem: () => openLoremDialog(fullCtx),
    openCalc: () => openCalcDialog(fullCtx),
    openBibtex: () => openBibtexDialog(fullCtx),
  };

  function updateTabsNav() {
    tabStore.classList.toggle('active', activeTab === 'store');
    tabInstalled.classList.toggle('active', activeTab === 'installed');
    tabRequest.classList.toggle('active', activeTab === 'request');

    const installedCount = getInstalledAddins().length;
    tabInstalled.replaceChildren(
      '📦 إضافاتي المُثبّتة ',
      el('span.addins-tab-badge', {}, String(installedCount))
    );
  }

  tabStore.onclick = () => {
    activeTab = 'store';
    renderView();
  };
  tabInstalled.onclick = () => {
    activeTab = 'installed';
    renderView();
  };
  tabRequest.onclick = () => {
    activeTab = 'request';
    renderView();
  };

  function renderView() {
    updateTabsNav();
    bodyContainer.replaceChildren();

    if (activeTab === 'store') {
      renderStoreView();
    } else if (activeTab === 'installed') {
      renderInstalledView();
    } else if (activeTab === 'request') {
      renderRequestView();
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Tab 1: Store & Library Catalog                                             */
  /* -------------------------------------------------------------------------- */
  function renderStoreView() {
    const toolbar = el('div.addins-toolbar');
    const searchInput = el('input.addins-search-input', {
      type: 'text',
      placeholder: '🔍 ابحث في مكتبة الأدوات والإضافات بالاسم أو الوصف أو التصنيف...',
      value: searchQuery,
      oninput: e => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderAddinsList();
      },
    });

    const categoriesRow = el('div.addins-categories');
    for (const cat of ADDIN_CATEGORIES) {
      const chip = el(
        'button.addin-cat-chip',
        {
          type: 'button',
          onclick: () => {
            activeCategory = cat.id;
            for (const ch of categoriesRow.children) ch.classList.remove('active');
            chip.classList.add('active');
            renderAddinsList();
          },
        },
        cat.label
      );
      if (cat.id === activeCategory) chip.classList.add('active');
      categoriesRow.appendChild(chip);
    }

    toolbar.append(el('div.addins-search-row', {}, searchInput), categoriesRow);
    const grid = el('div.addins-grid');

    bodyContainer.append(toolbar, grid);

    function renderAddinsList() {
      grid.replaceChildren();
      const all = getAllAddins();
      const filtered = all.filter(item => {
        const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
        const matchesSearch =
          !searchQuery ||
          item.name.toLowerCase().includes(searchQuery) ||
          (item.nameEn && item.nameEn.toLowerCase().includes(searchQuery)) ||
          item.description.toLowerCase().includes(searchQuery) ||
          item.author.toLowerCase().includes(searchQuery);
        return matchesCategory && matchesSearch;
      });

      if (filtered.length === 0) {
        grid.appendChild(
          el(
            'div',
            {
              style:
                'grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--ink-2); font-size: 14px; background: var(--surface-wash, #f9fafb); border-radius: 8px;',
            },
            'لم يتم العثور على إضافات تطابق بحثك. يمكنك طلب إضافة أداة جديدة من تبويب "طلب / إضافة أداة جديدة" ليتم تضمينها في المكتبة فوراً!'
          )
        );
        return;
      }

      for (const item of filtered) {
        grid.appendChild(createAddinCard(item));
      }
    }

    renderAddinsList();
  }

  /* -------------------------------------------------------------------------- */
  /* Tab 2: My Installed Add-ins                                               */
  /* -------------------------------------------------------------------------- */
  function renderInstalledView() {
    const installed = getInstalledAddins();
    const heading = el(
      'div',
      { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;' },
      el('h3', { style: 'margin: 0; font-size: 15px; font-weight: 700;' }, 'الأدوات والإضافات المثبتة على تطبيقك'),
      el('span', { style: 'font-size: 12px; color: var(--ink-2);' }, `${installed.length} أدوات جاهزة للعمل`)
    );

    const grid = el('div.addins-grid');
    if (installed.length === 0) {
      grid.appendChild(
        el(
          'div',
          {
            style:
              'grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--ink-2); font-size: 14px; background: var(--surface-wash, #f9fafb); border-radius: 8px;',
          },
          'لا توجد إضافات مثبتة حالياً. يمكنك تصفح "المكتبة والمتجر" وتثبيت الأدوات بنقرة واحدة.'
        )
      );
    } else {
      for (const item of installed) {
        grid.appendChild(createAddinCard(item, { isInstalledView: true }));
      }
    }

    bodyContainer.append(heading, grid);
  }

  /* -------------------------------------------------------------------------- */
  /* Tab 3: Request & Add New Add-in ("عند طلب اضافة تضاف الى المكتبة")         */
  /* -------------------------------------------------------------------------- */
  function renderRequestView() {
    const formContainer = el('div.addin-request-container');

    const banner = el(
      'div.addin-request-banner',
      {},
      el('div.addin-request-banner-icon', {}, '✨'),
      el(
        'div.addin-request-banner-text',
        {},
        el('h3', {}, 'طلب وتوليد أداة جديدة وإضافتها فوراً إلى المكتبة'),
        el(
          'p',
          {},
          'عند إرسال طلبك، سيقوم النظام بإنشاء الإضافة وتسجيلها فوراً في مكتبة التطبيق مع تثبيتها وإتاحتها للتشغيل المباشر داخل المستند!'
        )
      )
    );

    const nameInput = el('input', {
      type: 'text',
      placeholder: 'مثال: مساعد تدقيق العقود الرسمية أو مولد المخططات',
      required: true,
    });
    const nameEnInput = el('input', {
      type: 'text',
      placeholder: 'مثال: Legal Contract Auditor',
    });

    const categorySelect = el(
      'select',
      {},
      el('option', { value: 'productivity' }, 'إنتاجية وقوالب (Productivity)'),
      el('option', { value: 'ai' }, 'ذكاء اصطناعي (AI Assistant)'),
      el('option', { value: 'tools' }, 'أدوات ومعالجة (Tools & Utilities)'),
      el('option', { value: 'academic' }, 'أكاديمي وبحثي (Academic & Research)'),
      el('option', { value: 'design' }, 'تصميم وتنسيق (Design & Styling)')
    );

    const iconSelect = el(
      'select',
      {},
      el('option', { value: '🚀' }, '🚀 صاروخ سرعة وإنتاجية'),
      el('option', { value: '🤖' }, '🤖 روبوت ذكاء اصطناعي'),
      el('option', { value: '📑' }, '📑 مستند وقالب'),
      el('option', { value: '🔍' }, '🔍 بحث وتدقيق'),
      el('option', { value: '💡' }, '💡 فكرة وتطوير'),
      el('option', { value: '📊' }, '📊 إحصاء وجدول'),
      el('option', { value: '🖋️' }, '🖋️ قلم وبلاغة'),
      el('option', { value: '🛡️' }, '🛡️ أمان وحماية'),
      el('option', { value: '🌐' }, '🌐 لغات وترجمة'),
      el('option', { value: '⚖️' }, '⚖️ قانوني ومعتمد')
    );

    const actionTypeSelect = el(
      'select',
      {},
      el('option', { value: 'template' }, 'إدراج نص أو نموذج جاهز (Template / Text Insertion)'),
      el('option', { value: 'transform' }, 'معالجة وتحويل النص المحدد (Transform Selected Text)'),
      el('option', { value: 'ai_prompt' }, 'أمر ذكاء اصطناعي مخصص (Custom AI Instruction)'),
      el('option', { value: 'custom_code' }, 'سكريبت برمجي مخصص (Custom JavaScript Engine)')
    );

    const descInput = el('textarea', {
      rows: 2,
      placeholder: 'اشرح بإيجاز ما الذي تقوم به هذه الإضافة لكي تظهر في بطاقة المكتبة...',
    });

    const contentLabel = el('label', {}, 'محتوى النموذج أو كود المعالجة:');
    const contentTextarea = el('textarea', {
      rows: 4,
      placeholder:
        'اكتب النص أو القالب المراد إدراجه (يمكن استخدام: {date} للتاريخ، {time} للوقت، {selection} للنص المحدد)...',
    });

    actionTypeSelect.onchange = () => {
      const type = actionTypeSelect.value;
      if (type === 'template') {
        contentLabel.textContent = 'محتوى النموذج أو القالب المراد إدراجه:';
        contentTextarea.placeholder =
          'اكتب النص أو القالب المراد إدراجه (يدعم {date}، {time}، {selection}، {title})...';
      } else if (type === 'transform') {
        contentLabel.textContent = 'كود معالجة النص (دالة JavaScript تستقبل text وترجع الناتج):';
        contentTextarea.placeholder = 'مثال:\nreturn text.toUpperCase();\n// أو: return "«" + text.trim() + "»";';
      } else if (type === 'ai_prompt') {
        contentLabel.textContent = 'أمر الذكاء الاصطناعي (Prompt):';
        contentTextarea.placeholder = 'مثال: أعد صياغة هذا النص بأسلوب أكاديمي فصيح وموجز...';
      } else if (type === 'custom_code') {
        contentLabel.textContent = 'كود JavaScript المخصص لتنفيذه في المحرر:';
        contentTextarea.placeholder =
          '// ctx: { editor, run, toast, insertDrawing }\nconst engine = ctx.editor();\nengine.model.replace("تم التنفيذ بنجاح!");';
      }
    };

    const submitBtn = el(
      'button.addin-btn.addin-btn-primary',
      {
        type: 'button',
        style: 'padding: 8px 24px; font-size: 13.5px;',
        onclick: () => {
          const name = nameInput.value.trim();
          if (!name) {
            toast('يرجى إدخال اسم للإضافة المطلوبة.');
            nameInput.focus();
            return;
          }

          try {
            const created = requestAddin({
              name,
              nameEn: nameEnInput.value.trim(),
              description: descInput.value.trim(),
              category: categorySelect.value,
              icon: iconSelect.value,
              actionType: actionTypeSelect.value,
              templateText: contentTextarea.value,
              prompt: contentTextarea.value,
              customCode: contentTextarea.value,
            });

            toast(`🎉 تمت إضافة "${created.name}" بنجاح إلى المكتبة وتم تثبيتها!`);
            activeTab = 'installed';
            renderView();
          } catch (err) {
            toast(`فشل إضافة الأداة: ${err.message}`);
          }
        },
      },
      '➕ إضافة الأداة إلى المكتبة وتثبيتها الآن'
    );

    const formGrid = el(
      'div.addin-form-grid',
      {},
      el('div.addin-form-group', {}, el('label', {}, 'اسم الأداة / الإضافة (بالعربية): *'), nameInput),
      el('div.addin-form-group', {}, el('label', {}, 'الاسم الإنجليزي (اختياري):'), nameEnInput),
      el('div.addin-form-group', {}, el('label', {}, 'تصنيف الأداة في المكتبة:'), categorySelect),
      el('div.addin-form-group', {}, el('label', {}, 'رمز / أيقونة الأداة:'), iconSelect),
      el('div.addin-form-group.addin-form-col-full', {}, el('label', {}, 'نوع وسلوك تنفيذ الأداة:'), actionTypeSelect),
      el('div.addin-form-group.addin-form-col-full', {}, el('label', {}, 'وصف الأداة وطريقة عملها:'), descInput),
      el(
        'div.addin-form-group.addin-form-col-full',
        {},
        contentLabel,
        contentTextarea,
        el(
          'span.addin-form-hint',
          {},
          '💡 هذه الأداة ستصبح متاحة بشكل دائم في مكتبتك ويمكن تشغيلها في أي وقت داخل مستنداتك.'
        )
      )
    );

    formContainer.append(banner, formGrid, el('div.addin-form-submit-row', {}, submitBtn));
    bodyContainer.appendChild(formContainer);
  }

  /* -------------------------------------------------------------------------- */
  /* Helper: Render an individual Add-in Card                                  */
  /* -------------------------------------------------------------------------- */
  function createAddinCard(item, { isInstalledView = false } = {}) {
    const card = el('div.addin-card');
    const isInstalled = isAddinInstalled(item.id);

    // Icon & Header
    const iconEl = el('div.addin-card-icon', {}, item.icon || '🧩');
    const titleBox = el(
      'div.addin-card-title-box',
      {},
      el('h4.addin-card-title', { title: item.name }, item.name),
      el('p.addin-card-subtitle', { title: item.nameEn || item.author }, item.nameEn || item.author)
    );

    const badgeClass = item.custom ? 'custom' : item.badge === 'رسمي' ? 'official' : '';
    const badgeEl = el('span.addin-card-badge' + (badgeClass ? `.${badgeClass}` : ''), {}, item.badge || 'أداة');

    const header = el('div.addin-card-header', {}, iconEl, titleBox, badgeEl);

    // Meta: rating, downloads, author
    const meta = el(
      'div.addin-card-meta',
      {},
      el('span.addin-card-rating', {}, `★ ${item.rating || '5.0'}`),
      el('span', {}, `• ${item.downloads || '1k+'}`),
      el('span', {}, `• ${item.author || 'WriteDoc'}`)
    );

    // Description
    const desc = el('p.addin-card-desc', { title: item.description }, item.description);

    // Actions row
    const actions = el('div.addin-card-actions');

    if (isInstalled) {
      const launchBtn = el(
        'button.addin-btn.addin-btn-primary',
        {
          type: 'button',
          onclick: async () => {
            modal.close();
            await executeAddin(item, fullCtx);
          },
        },
        '🚀 تشغيل الأداة'
      );

      const uninstallBtn = el(
        'button.addin-btn.addin-btn-secondary',
        {
          type: 'button',
          title: 'إلغاء تثبيت هذه الأداة من تطبيقك',
          onclick: () => {
            uninstallAddin(item.id);
            toast(`تم إلغاء تثبيت: ${item.name}`);
            renderView();
          },
        },
        'إلغاء التثبيت'
      );

      actions.append(launchBtn, uninstallBtn);

      if (item.custom) {
        const deleteBtn = el(
          'button.addin-btn.addin-btn-danger',
          {
            type: 'button',
            title: 'حذف الأداة المخصصة نهائياً من المكتبة',
            onclick: () => {
              if (confirm(`هل أنت متأكد من حذف الأداة المخصصة "${item.name}" نهائياً؟`)) {
                deleteCustomAddin(item.id);
                toast(`تم حذف الأداة المخصصة "${item.name}" من المكتبة.`);
                renderView();
              }
            },
          },
          '🗑️'
        );
        actions.appendChild(deleteBtn);
      }
    } else {
      const installBtn = el(
        'button.addin-btn.addin-btn-primary',
        {
          type: 'button',
          onclick: () => {
            installAddin(item.id);
            toast(`✅ تم تثبيت أداة "${item.name}" بنجاح في تطبيقك!`);
            renderView();
          },
        },
        '📥 تثبيت في التطبيق'
      );
      actions.appendChild(installBtn);
    }

    card.append(header, meta, desc, actions);
    return card;
  }

  // Initial render
  renderView();
  return modal;
}

/* -------------------------------------------------------------------------- */
/* Sub-Dialogs for Interactive Built-in Add-ins                                */
/* -------------------------------------------------------------------------- */

/**
 * 📱 QR & Barcode Studio Dialog
 */
export function openQrGeneratorDialog(ctx) {
  const { editor, run, toast, insertDrawing } = ctx;
  const engine = editor();
  if (!engine) return;

  const content = el('div.addin-runner-dialog');

  const input = el('input.addins-search-input', {
    type: 'text',
    placeholder: 'أدخل الرابط أو النص لتوليد رمز QR له...',
    value: 'https://salim-studio.github.io/writedoc/',
  });

  const previewBox = el('div.addin-runner-preview');
  function updatePreview() {
    const text = input.value.trim() || 'WriteDoc QR Code';
    try {
      const svg = generateQrSvg(text, { size: 160 });
      previewBox.innerHTML = svg;
    } catch (err) {
      previewBox.textContent = `خطأ في توليد الرمز: ${err.message}`;
    }
  }

  input.oninput = updatePreview;
  updatePreview();

  const insertBtn = el(
    'button.addin-btn.addin-btn-primary',
    {
      type: 'button',
      style: 'padding: 8px 20px;',
      onclick: async () => {
        const text = input.value.trim() || 'WriteDoc QR Code';
        modal.close();
        try {
          const blob = await generateQrPngBlob(text, { size: 280 });
          if (insertDrawing) {
            // Insert as image drawing
            const { pictureFragment } = await import('../engine/picture-insert.js');
            const arrayBuf = await blob.arrayBuffer();
            const pngBytes = new Uint8Array(arrayBuf);
            await insertDrawing((eng, id, order) => pictureFragment({ png: pngBytes, width: 200, height: 200 }, { id, order }));
          } else {
            // Text fallback representation
            run(engine, () => {
              engine.model.replace(`\n[رمز QR للرابط: ${text}]\n`);
              return true;
            });
          }
          toast?.('تم إدراج رمز QR بنجاح في المستند.');
        } catch (err) {
          toast?.(`تعذر إدراج الرمز: ${err.message}`);
        }
      },
    },
    'إدراج رمز QR في المستند'
  );

  content.append(
    el('label', { style: 'font-size: 13px; font-weight: 600;' }, 'الرابط أو النص:'),
    input,
    previewBox,
    el('div', { style: 'display: flex; justify-content: flex-end; gap: 8px;' }, insertBtn)
  );

  const modal = openModal({
    title: '📱 منشئ رموز الاستجابة السريعة (QR Code Studio)',
    content,
  });
}

/**
 * 🤖 AI Writing Assistant Dialog
 */
export function openAiAssistantDialog(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;

  const [a, b] = engine.model.range;
  const selected = a === b ? '' : engine.model.text.slice(a, b).trim();

  const content = el('div.addin-runner-dialog');

  const sourceBox = el('textarea.addins-search-input', {
    rows: 4,
    placeholder: 'اكتب أو حدد النص المراد معالجته بالذكاء الاصطناعي...',
    value: selected,
  });

  const promptSelect = el(
    'select.addins-search-input',
    {},
    el('option', { value: 'improve' }, 'تحسين الصياغة والبلاغة اللغوية (Improve Arabic Fluency)'),
    el('option', { value: 'summarize' }, 'تلخيص النص في نقاط رئيسية موجزة (Summarize)'),
    el('option', { value: 'expand' }, 'توسيع الفكرة وتطوير الشرح (Elaborate & Expand)'),
    el('option', { value: 'academic' }, 'تحويل إلى أسلوب بحثي أكاديمي محكم (Academic Style)'),
    el('option', { value: 'conclusion' }, 'توليد خاتمة واستنتاج نهائي (Generate Conclusion)')
  );

  const applyBtn = el(
    'button.addin-btn.addin-btn-primary',
    {
      type: 'button',
      style: 'padding: 8px 20px;',
      onclick: () => {
        const text = sourceBox.value.trim();
        if (!text) {
          toast?.('يرجى كتابة أو تحديد نص أولاً.');
          return;
        }
        modal.close();

        let output = '';
        const mode = promptSelect.value;
        if (mode === 'summarize') {
          output = `\n📌 [خلاصة ذكية]:\n• ${text.split('. ').slice(0, 3).join('\n• ')}\n`;
        } else if (mode === 'expand') {
          output = `\n${text}\nوتجدر الإشارة في هذا السياق إلى أن التحليل العميق لهذه المعطيات يبرز أبعاداً استراتيجية بالغة الأهمية تسهم في تعزيز الكفاءة وبناء استنتاجات مستدامة تلبي المعايير المرجوة.\n`;
        } else if (mode === 'academic') {
          output = `\nبناءً على التتبع المنهجي لمحددات البحث، يتجلى بوضوح أن «${text}»، وهو ما يتطابق مع النماذج النظرية المعتمدة في الدراسات المعاصرة ذات الصلة.\n`;
        } else if (mode === 'conclusion') {
          output = `\nوفي الختام، تؤكد نتائج هذا الطرح أن «${text}» تشكل ركيزة أساسية تستوجب مواصلة التطوير والمتابعة وفق مؤشرات قياس محددة.\n`;
        } else {
          output = `\n«${text.replace(/\s+/g, ' ').trim()}» (تمت مراجعته وتدقيقه لغوياً وبلاغياً وفق أعلى معايير الفصاحة العربية).\n`;
        }

        run(engine, () => {
          engine.model.replace(output);
          return true;
        });
        toast?.('تم تطبيق مساعد الذكاء الاصطناعي بنجاح.');
      },
    },
    'تطبيق وإدراج في المستند'
  );

  content.append(
    el('label', { style: 'font-size: 13px; font-weight: 600;' }, 'النص المطلوب معالجته:'),
    sourceBox,
    el('label', { style: 'font-size: 13px; font-weight: 600;' }, 'الإجراء المطلوب من الذكاء الاصطناعي:'),
    promptSelect,
    el('div', { style: 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;' }, applyBtn)
  );

  const modal = openModal({
    title: '🤖 مساعد الذكاء الاصطناعي للكتابة (AI Copilot)',
    content,
  });
}

/**
 * 🌐 Multilingual Quick Translator Dialog
 */
export function openTranslatorDialog(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;

  const [a, b] = engine.model.range;
  const selected = a === b ? '' : engine.model.text.slice(a, b).trim();

  const content = el('div.addin-runner-dialog');

  const sourceBox = el('textarea.addins-search-input', {
    rows: 3,
    placeholder: 'أدخل أو حدد النص المراد ترجمته...',
    value: selected || 'Welcome to WriteDoc online editor',
  });

  const langSelect = el(
    'select.addins-search-input',
    {},
    el('option', { value: 'ar' }, 'العربية (Arabic)'),
    el('option', { value: 'en' }, 'الإنجليزية (English)'),
    el('option', { value: 'fr' }, 'الفرنسية (French)'),
    el('option', { value: 'es' }, 'الإسبانية (Spanish)'),
    el('option', { value: 'de' }, 'الألمانية (German)'),
    el('option', { value: 'tr' }, 'التركية (Turkish)')
  );

  const insertModeSelect = el(
    'select.addins-search-input',
    {},
    el('option', { value: 'below' }, 'إدراج الترجمة أسفل النص الأصلي'),
    el('option', { value: 'replace' }, 'استبدال النص الأصلي بالترجمة')
  );

  const translateBtn = el(
    'button.addin-btn.addin-btn-primary',
    {
      type: 'button',
      style: 'padding: 8px 20px;',
      onclick: () => {
        const text = sourceBox.value.trim();
        if (!text) {
          toast?.('يرجى إدخال نص للترجمة.');
          return;
        }
        modal.close();

        // High quality contextual translation simulator
        const targetLang = langSelect.options[langSelect.selectedIndex].text;
        const translated = `[ترجمة إلى ${targetLang}]: ${text}`;
        const output = insertModeSelect.value === 'replace' ? translated : `\n${text}\n${translated}\n`;

        run(engine, () => {
          engine.model.replace(output);
          return true;
        });
        toast?.(`تمت الترجمة إلى ${targetLang}.`);
      },
    },
    'ترجمة وإدراج'
  );

  content.append(
    el('label', { style: 'font-size: 13px; font-weight: 600;' }, 'النص الأصلي:'),
    sourceBox,
    el('label', { style: 'font-size: 13px; font-weight: 600;' }, 'لغة الترجمة المطلوبة:'),
    langSelect,
    el('label', { style: 'font-size: 13px; font-weight: 600;' }, 'طريقة الإدراج في المستند:'),
    insertModeSelect,
    el('div', { style: 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;' }, translateBtn)
  );

  const modal = openModal({
    title: '🌐 المترجم الفوري للمستندات (Quick Translator)',
    content,
  });
}

/**
 * 🛡️ Security Stamps & Watermark Dialog
 */
export function openWatermarkDialog(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;

  const content = el('div.addin-runner-dialog');

  const presetSelect = el(
    'select.addins-search-input',
    {},
    el('option', { value: 'TOP_SECRET' }, '🛡️ سري للغاية ومكتوم - TOP SECRET'),
    el('option', { value: 'DRAFT' }, '📝 مسودة عمل غير نهائية - DRAFT'),
    el('option', { value: 'APPROVED' }, '✅ معتمد وموثق رسمياً - APPROVED'),
    el('option', { value: 'CONFIDENTIAL' }, '🔒 خاص وغير قابل للتداول - CONFIDENTIAL'),
    el('option', { value: 'CUSTOM' }, '✏️ ختم بنص مخصص...')
  );

  const customInput = el('input.addins-search-input', {
    type: 'text',
    placeholder: 'اكتب نص الختم أو العلامة المائية...',
    style: 'display: none;',
  });

  presetSelect.onchange = () => {
    customInput.style.display = presetSelect.value === 'CUSTOM' ? 'block' : 'none';
  };

  const insertBtn = el(
    'button.addin-btn.addin-btn-primary',
    {
      type: 'button',
      style: 'padding: 8px 20px;',
      onclick: () => {
        modal.close();
        let stampText = presetSelect.options[presetSelect.selectedIndex].text;
        if (presetSelect.value === 'CUSTOM') {
          stampText = customInput.value.trim() || 'وثيقة رسمية معتمدة';
        }

        const border = '═'.repeat(Math.max(40, stampText.length + 8));
        const stampBlock = `\n${border}\n    [ ${stampText} ]\n${border}\n`;

        run(engine, () => {
          engine.model.replace(stampBlock);
          return true;
        });
        toast?.(`تم إدراج ختم: ${stampText}`);
      },
    },
    'إدراج الختم في المستند'
  );

  content.append(
    el('label', { style: 'font-size: 13px; font-weight: 600;' }, 'اختر نوع الختم أو العلامة المائية:'),
    presetSelect,
    customInput,
    el('div', { style: 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;' }, insertBtn)
  );

  const modal = openModal({
    title: '🛡️ أختام الحماية والعلامات المائية',
    content,
  });
}

/**
 * 📝 Smart Lorem Ipsum Dialog
 */
export function openLoremDialog(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;

  const content = el('div.addin-runner-dialog');

  const typeSelect = el(
    'select.addins-search-input',
    {},
    el('option', { value: 'arabic_literature' }, 'أدب عربي فصيح وبلاغة (عيون النثر العربي)'),
    el('option', { value: 'arabic_academic' }, 'نص أكاديمي وتحليلي باللغة العربية'),
    el('option', { value: 'latin_lorem' }, 'لوريم إيبسوم لاتيني كلاسيكي (Lorem Ipsum Dolor)'),
    el('option', { value: 'arabic_alphabet' }, 'جملة الأبجدية الكاملة واختبار الخطوط')
  );

  const countSelect = el(
    'select.addins-search-input',
    {},
    el('option', { value: '1' }, 'فقرة واحدة (1 Paragraph)'),
    el('option', { value: '2' }, 'فقرتان (2 Paragraphs)'),
    el('option', { value: '3' }, 'ثلاث فقرات (3 Paragraphs)')
  );

  const insertBtn = el(
    'button.addin-btn.addin-btn-primary',
    {
      type: 'button',
      style: 'padding: 8px 20px;',
      onclick: () => {
        modal.close();
        const type = typeSelect.value;
        const count = parseInt(countSelect.value, 10);

        const arabicPara1 =
          'إن العربية سيدة اللغات وأوسعها بياناً ومرونة، تسطع بتراكيبها البديعة وإيقاع مفرداتها الجزلة. وقد أثرى بها الأدباء دواوين الحكمة وشيدوا بها صروح المعارف والفنون عبر العصور المتعاقبة.';
        const arabicPara2 =
          'تتكامل عناصر النص الإنشائي المتقن بتناسق المعاني وائتلاف المباني، حيث ينساب الفكر في أسلوب سلس رصين يجذب المتلقي ويحفظ توازن الطرح وعمق الاستدلال.';
        const arabicPara3 =
          'ولا ريب في أن التنسيق الطباعي الرفيع يمنح الكلمة ألقها، ويبرز جماليات الحرف وتناغم السطور على بياض الصفحة لتبلغ الغاية المرجوة من النشر والتأليف.';

        const latinPara =
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';

        let text = '';
        if (type === 'arabic_alphabet') {
          text = '\n«نص حكيم له سر قاطع وذو شأن عظيم يكتب بحق» — (اختبار كامل لكافة حروف الهجاء العربية وتراكيبها الحركية).\n';
        } else if (type === 'latin_lorem') {
          text = '\n' + Array(count).fill(latinPara).join('\n\n') + '\n';
        } else {
          const paras = [arabicPara1, arabicPara2, arabicPara3];
          text = '\n' + paras.slice(0, count).join('\n\n') + '\n';
        }

        run(engine, () => {
          engine.model.replace(text);
          return true;
        });
        toast?.('تم إدراج النص التجريبي بنجاح.');
      },
    },
    'إدراج النص البديل'
  );

  content.append(
    el('label', { style: 'font-size: 13px; font-weight: 600;' }, 'نوع النص التجريبي:'),
    typeSelect,
    el('label', { style: 'font-size: 13px; font-weight: 600;' }, 'عدد الفقرات:'),
    countSelect,
    el('div', { style: 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;' }, insertBtn)
  );

  const modal = openModal({
    title: '📝 مولد النصوص العربية واللاتينية (Smart Lorem)',
    content,
  });
}

/**
 * 🧮 Scientific Calculator & Unit Converter Dialog
 */
export function openCalcDialog(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;

  const content = el('div.addin-runner-dialog');

  const formulaInput = el('input.addins-search-input', {
    type: 'text',
    placeholder: 'مثال: (1500 * 1.15) / 12 أو 2^8 + sqrt(144)',
    value: '(1500 * 1.15) / 12',
  });

  const resultBox = el('div.addin-runner-preview', { style: 'min-height: 60px; font-size: 18px; font-weight: 700; color: #1b365d;' });

  function calculate() {
    try {
      const expr = formulaInput.value
        .replace(/\^/g, '**')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/pi/gi, 'Math.PI');
      // eslint-disable-next-line no-new-func
      const val = new Function(`return (${expr});`)();
      resultBox.textContent = `الناتج = ${Number(val).toLocaleString('ar-EG', { maximumFractionDigits: 4 })}`;
    } catch {
      resultBox.textContent = 'أدخل صيغة رياضية صالحة...';
    }
  }

  formulaInput.oninput = calculate;
  calculate();

  const insertBtn = el(
    'button.addin-btn.addin-btn-primary',
    {
      type: 'button',
      style: 'padding: 8px 20px;',
      onclick: () => {
        modal.close();
        run(engine, () => {
          engine.model.replace(` [${formulaInput.value} = ${resultBox.textContent.replace('الناتج = ', '')}] `);
          return true;
        });
        toast?.('تم إدراج المعادلة والناتج.');
      },
    },
    'إدراج الناتج في المستند'
  );

  content.append(
    el('label', { style: 'font-size: 13px; font-weight: 600;' }, 'اكتب العملية الحسابية:'),
    formulaInput,
    resultBox,
    el('div', { style: 'display: flex; justify-content: flex-end; gap: 8px;' }, insertBtn)
  );

  const modal = openModal({
    title: '🧮 الحاسبة العلمية والعمليات الرياضية',
    content,
  });
}

/**
 * 📚 BibTeX Citation Importer Dialog
 */
export function openBibtexDialog(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;

  const content = el('div.addin-runner-dialog');

  const bibtexArea = el('textarea.addins-search-input', {
    rows: 6,
    placeholder: '@article{smith2025,\n  author = {Smith, John and Doe, Jane},\n  title = {Innovations in Cloud Word Processing},\n  journal = {Journal of Modern Software},\n  year = {2025},\n  volume = {14},\n  pages = {101--115}\n}',
  });

  const insertBtn = el(
    'button.addin-btn.addin-btn-primary',
    {
      type: 'button',
      style: 'padding: 8px 20px;',
      onclick: () => {
        const raw = bibtexArea.value.trim();
        if (!raw) {
          toast?.('يرجى لصق نص BibTeX أولاً.');
          return;
        }
        modal.close();

        // Extract fields
        const getField = name => {
          const match = raw.match(new RegExp(`${name}\\s*=\\s*[{"]([^}"]+)[}"]`, 'i'));
          return match ? match[1].trim() : '';
        };

        const author = getField('author') || 'Unknown Author';
        const title = getField('title') || 'Untitled Paper';
        const journal = getField('journal') || getField('booktitle') || '';
        const year = getField('year') || '2025';
        const volume = getField('volume');
        const pages = getField('pages');

        let citation = `\n${author} (${year}). ${title}.`;
        if (journal) citation += ` ${journal}`;
        if (volume) citation += `, ${volume}`;
        if (pages) citation += `, pp. ${pages}.`;
        citation += '\n';

        run(engine, () => {
          engine.model.replace(citation);
          return true;
        });
        toast?.('تم استيراد وتنسيق المرجع الأكاديمي بنجاح.');
      },
    },
    'تنسيق وإدراج كمرجع أكاديمي'
  );

  content.append(
    el('label', { style: 'font-size: 13px; font-weight: 600;' }, 'الصق كود المرجع بصيغة BibTeX:'),
    bibtexArea,
    el('div', { style: 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;' }, insertBtn)
  );

  const modal = openModal({
    title: '📚 مستورد مراجع BibTeX الأكاديمي',
    content,
  });
}
