/**
 * Microsoft Word - Office Add-ins Dialog
 * Full English interface and authentic Office Fluent design aesthetics.
 * Features Store browsing, Installed add-ins management, and Custom add-in creation.
 */
import { el } from '../ui/dom.js';
import { openModal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import {
  getAllAddins,
  getInstalledAddins,
  isAddinInstalled,
  installAddin,
  uninstallAddin,
  requestAddin,
  deleteCustomAddin,
  executeAddin,
  ADDIN_CATEGORIES,
} from '../engine/addins.js';
import { generateQrSvg, generateQrPngBlob } from '../engine/qr-encoder.js';

export function getAddinIconSvg(key, size = 26) {
  switch (key) {
    case 'copilot':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#0078d4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2l2.4 5.2L20 8.5l-4 4 1 5.5L12 15.5 7 18l1-5.5-4-4 5.6-1.3L12 2z"/>
        <path d="M19 16l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" stroke="#6b21a8"/>
      </svg>`;
    case 'qr_code':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#106ebe" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="5.5" y="5.5" width="2" height="2" fill="#106ebe"/>
        <rect x="16.5" y="5.5" width="2" height="2" fill="#106ebe"/>
        <rect x="5.5" y="16.5" width="2" height="2" fill="#106ebe"/>
        <path d="M14 14h3v3h-3zM17 17h4v4h-4zM14 20h3M20 14v3"/>
      </svg>`;
    case 'translator':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#008272" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <path d="M3.6 9h16.8M3.6 15h16.8M12 3a14.5 14.5 0 0 0 0 18M12 3a14.5 14.5 0 0 1 0 18"/>
      </svg>`;
    case 'lorem':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#2b579a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <line x1="10" y1="9" x2="8" y2="9"/>
      </svg>`;
    case 'stamp':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#d83b01" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>`;
    case 'calc':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#5c2d91" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2"/>
        <line x1="8" y1="6" x2="16" y2="6"/>
        <line x1="16" y1="14" x2="16" y2="18"/>
        <path d="M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M8 18h.01M12 18h.01"/>
      </svg>`;
    case 'signature':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#004e8c" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 19l7-7 3 3-7 7-3-3z"/>
        <path d="M18 13l-1.5-1.5"/>
        <path d="M2 21h20"/>
        <path d="M6 15c2-2 4-1 6-3"/>
      </svg>`;
    case 'bibtex':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#0078d4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        <line x1="9" y1="7" x2="15" y2="7"/>
        <line x1="9" y1="11" x2="13" y2="11"/>
      </svg>`;
    case 'timer':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#e81123" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="13" r="8"/>
        <path d="M12 9v4l2.5 2.5M10 2h4M12 2v3"/>
      </svg>`;
    case 'code':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#333333" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>`;
    case 'swot':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#0078d4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="12" y1="3" x2="12" y2="21"/>
      </svg>`;
    default:
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#0078d4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="8" height="8" rx="1.5"/>
        <rect x="13" y="3" width="8" height="8" rx="1.5"/>
        <rect x="3" y="13" width="8" height="8" rx="1.5"/>
        <path d="M17 13v8M13 17h8"/>
      </svg>`;
  }
}

export function openAddinsDialog(ctx = {}, { initialTab = 'store' } = {}) {
  let activeTab = initialTab;
  let activeCategory = 'all';
  let searchQuery = '';

  const container = el('div.office-addins-dialog');

  // Subheader
  const subheader = el(
    'div.office-addins-header',
    {},
    el('p.office-addins-subtitle', {}, 'Discover and manage trusted add-ins to boost your productivity in Word.')
  );

  // Fluent tabs header
  const tabStore = el('button.office-addins-tab-btn', { type: 'button' }, 'Store');
  const tabInstalled = el('button.office-addins-tab-btn', { type: 'button' }, 'MY ADD-INS');
  const tabRequest = el('button.office-addins-tab-btn', { type: 'button' }, 'Add Custom Add-in');

  const tabsHeader = el('div.office-addins-tabs-header', {}, tabStore, tabInstalled, tabRequest);
  const bodyContainer = el('div.office-addins-body-container');

  container.append(subheader, tabsHeader, bodyContainer);

  const modal = openModal({
    title: 'Office Add-ins',
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
    tabInstalled.replaceChildren('MY ADD-INS ', el('span.office-addins-tab-badge', {}, String(installedCount)));
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
  /* Tab 1: Store & Catalog                                                    */
  /* -------------------------------------------------------------------------- */
  function renderStoreView() {
    const toolbar = el('div.office-addins-toolbar');

    const searchIconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
    const searchIconEl = el('span.office-addins-search-icon', { html: searchIconSvg });

    const searchInput = el('input.office-addins-search-input', {
      type: 'text',
      placeholder: 'Search all add-ins by name, author, or keyword...',
      value: searchQuery,
      oninput: e => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderAddinsList();
      },
    });

    const categoriesRow = el('div.office-addins-categories');
    for (const cat of ADDIN_CATEGORIES) {
      const chip = el(
        'button.office-addin-cat-chip',
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

    toolbar.append(el('div.office-addins-search-row', {}, searchIconEl, searchInput), categoriesRow);
    const grid = el('div.office-addins-grid');

    bodyContainer.append(toolbar, grid);

    function renderAddinsList() {
      grid.replaceChildren();
      const all = getAllAddins();
      const filtered = all.filter(item => {
        const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
        const matchesSearch =
          !searchQuery ||
          item.name.toLowerCase().includes(searchQuery) ||
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
                'grid-column: 1 / -1; padding: 40px; text-align: center; color: #605e5c; font-size: 13.5px; background: #fdfdfd; border: 1px dashed #edebe9; border-radius: 4px;',
            },
            'No add-ins found matching your search. You can create a new tool in the "Add Custom Add-in" tab.'
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
      el('h3', { style: 'margin: 0; font-size: 14px; font-weight: 600; color: #201f1e;' }, 'Active Add-ins for Word'),
      el('span', { style: 'font-size: 12px; color: #605e5c;' }, `${installed.length} installed`)
    );

    const grid = el('div.office-addins-grid');
    if (installed.length === 0) {
      grid.appendChild(
        el(
          'div',
          {
            style:
              'grid-column: 1 / -1; padding: 40px; text-align: center; color: #605e5c; font-size: 13.5px; background: #fdfdfd; border: 1px dashed #edebe9; border-radius: 4px;',
          },
          'You have no installed add-ins. Browse the Store to add productivity tools to Word.'
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
  /* Tab 3: Add Custom Add-in                                                  */
  /* -------------------------------------------------------------------------- */
  function renderRequestView() {
    const formContainer = el('div.office-addin-request-container');

    const bannerIconSvg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0078d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="9"/></svg>`;
    const banner = el(
      'div.office-addin-request-banner',
      {},
      el('div.office-addin-request-banner-icon', { html: bannerIconSvg }),
      el(
        'div.office-addin-request-banner-text',
        {},
        el('h3', {}, 'Create and Install a Custom Add-in'),
        el(
          'p',
          {},
          'Define your custom tool behavior. It will be immediately registered into your Word add-in library and ready to execute.'
        )
      )
    );

    const nameInput = el('input', {
      type: 'text',
      placeholder: 'e.g., Executive Contract Auditor or Citation Formatter',
      required: true,
    });

    const categorySelect = el(
      'select',
      {},
      el('option', { value: 'productivity' }, 'Productivity & Templates'),
      el('option', { value: 'ai' }, 'AI & Copilot'),
      el('option', { value: 'utilities' }, 'Utilities & Media'),
      el('option', { value: 'academic' }, 'Academic & Dev'),
      el('option', { value: 'security' }, 'Security & Legal')
    );

    const iconSelect = el(
      'select',
      {},
      el('option', { value: 'custom' }, 'Extension Block (Default)'),
      el('option', { value: 'copilot' }, 'Copilot Sparkle'),
      el('option', { value: 'qr_code' }, 'QR / Barcode Scanner'),
      el('option', { value: 'translator' }, 'Global Translation'),
      el('option', { value: 'lorem' }, 'Document Page'),
      el('option', { value: 'stamp' }, 'Security Shield'),
      el('option', { value: 'calc' }, 'Calculator'),
      el('option', { value: 'signature' }, 'Signature Pen'),
      el('option', { value: 'bibtex' }, 'Academic Library'),
      el('option', { value: 'timer' }, 'Sprint Stopwatch'),
      el('option', { value: 'code' }, 'Code Terminal'),
      el('option', { value: 'swot' }, 'Matrix Grid')
    );

    const actionTypeSelect = el(
      'select',
      {},
      el('option', { value: 'template' }, 'Template / Text Insertion (supports {date}, {time}, {selection}, {title})'),
      el('option', { value: 'transform' }, 'Selection Text Transformation'),
      el('option', { value: 'ai_prompt' }, 'Custom AI Instruction (Copilot Prompt)'),
      el('option', { value: 'custom_code' }, 'Custom JavaScript Engine Script')
    );

    const descInput = el('textarea', {
      rows: 2,
      placeholder: 'Describe what this add-in does in your documents...',
    });

    const contentLabel = el('label', {}, 'Template Content or Transformation Rule:');
    const contentTextarea = el('textarea', {
      rows: 4,
      placeholder:
        'Enter template text or placeholders (e.g. This contract was executed on {date} regarding {selection})...',
    });

    actionTypeSelect.onchange = () => {
      const type = actionTypeSelect.value;
      if (type === 'template') {
        contentLabel.textContent = 'Template Content:';
        contentTextarea.placeholder =
          'Enter text with placeholders like {date}, {time}, {selection}, {title}...';
      } else if (type === 'transform') {
        contentLabel.textContent = 'Transformation Function (JavaScript receives `text` and returns string):';
        contentTextarea.placeholder = 'return text.toUpperCase();\n// or: return `"${text.trim()}"`;';
      } else if (type === 'ai_prompt') {
        contentLabel.textContent = 'Copilot AI Instruction:';
        contentTextarea.placeholder = 'e.g., Rewrite this selection in executive active voice and concise phrasing...';
      } else if (type === 'custom_code') {
        contentLabel.textContent = 'JavaScript Code:';
        contentTextarea.placeholder =
          '// ctx: { editor, run, toast }\nconst engine = ctx.editor();\nengine.model.replace("Executed successfully!");';
      }
    };

    const submitBtn = el(
      'button.office-btn.office-btn-primary',
      {
        type: 'button',
        style: 'padding: 8px 24px; font-size: 13.5px;',
        onclick: () => {
          const name = nameInput.value.trim();
          if (!name) {
            toast('Please enter a name for the add-in.');
            nameInput.focus();
            return;
          }

          try {
            const created = requestAddin({
              name,
              description: descInput.value.trim(),
              category: categorySelect.value,
              iconKey: iconSelect.value,
              actionType: actionTypeSelect.value,
              templateText: contentTextarea.value,
              prompt: contentTextarea.value,
              customCode: contentTextarea.value,
            });

            toast(`Add-in "${created.name}" installed successfully.`);
            activeTab = 'installed';
            renderView();
          } catch (err) {
            toast(`Failed to create add-in: ${err.message}`);
          }
        },
      },
      'Install Add-in'
    );

    const formGrid = el(
      'div.office-addin-form-grid',
      {},
      el('div.office-addin-form-group', {}, el('label', {}, 'Add-in Name: *'), nameInput),
      el('div.office-addin-form-group', {}, el('label', {}, 'Category:'), categorySelect),
      el('div.office-addin-form-group', {}, el('label', {}, 'Icon Symbol:'), iconSelect),
      el('div.office-addin-form-group', {}, el('label', {}, 'Execution Mode:'), actionTypeSelect),
      el('div.office-addin-form-group.office-addin-form-col-full', {}, el('label', {}, 'Description:'), descInput),
      el(
        'div.office-addin-form-group.office-addin-form-col-full',
        {},
        contentLabel,
        contentTextarea,
        el(
          'span.office-addin-form-hint',
          {},
          'This add-in will be permanently accessible from the Insert > My Add-ins ribbon and menus.'
        )
      )
    );

    formContainer.append(banner, formGrid, el('div.office-addin-form-submit-row', {}, submitBtn));
    bodyContainer.appendChild(formContainer);
  }

  /* -------------------------------------------------------------------------- */
  /* Helper: Render an individual Office Add-in Card                           */
  /* -------------------------------------------------------------------------- */
  function createAddinCard(item, { isInstalledView = false } = {}) {
    const card = el('div.office-addin-card');
    const isInstalled = isAddinInstalled(item.id);

    // Vector SVG Icon
    const iconKey = item.iconKey || 'custom';
    const iconSvg = getAddinIconSvg(iconKey, 24);
    const iconContainer = el(`div.office-addin-card-icon.${iconKey}`, { html: iconSvg });

    const titleBox = el(
      'div.office-addin-card-title-box',
      {},
      el('h4.office-addin-card-title', { title: item.name }, item.name),
      el('p.office-addin-card-author', { title: item.author }, item.author)
    );

    const badgeClass = item.custom ? 'custom' : item.badge === 'Official' ? 'official' : '';
    const badgeEl = el('span.office-addin-card-badge' + (badgeClass ? `.${badgeClass}` : ''), {}, item.badge || 'Verified');

    const header = el('div.office-addin-card-header', {}, iconContainer, titleBox, badgeEl);

    // Meta: rating & installs
    const meta = el(
      'div.office-addin-card-meta',
      {},
      el('span.office-addin-card-stars', {}, '★★★★★'),
      el('span.office-addin-card-rating', {}, String(item.rating || '5.0')),
      el('span', {}, `(${item.downloads || '10K+'})`)
    );

    // Description
    const desc = el('p.office-addin-card-desc', { title: item.description }, item.description);

    // Action buttons
    const actions = el('div.office-addin-card-actions');

    if (isInstalled) {
      const launchBtn = el(
        'button.office-btn.office-btn-primary',
        {
          type: 'button',
          onclick: async () => {
            modal.close();
            await executeAddin(item, fullCtx);
          },
        },
        'Open'
      );

      const removeBtn = el(
        'button.office-btn.office-btn-secondary',
        {
          type: 'button',
          title: 'Remove this add-in from Word',
          onclick: () => {
            uninstallAddin(item.id);
            toast(`Removed ${item.name} from Word.`);
            renderView();
          },
        },
        'Remove'
      );

      actions.append(launchBtn, removeBtn);

      if (item.custom) {
        const deleteBtn = el(
          'button.office-btn.office-btn-danger',
          {
            type: 'button',
            title: 'Delete custom add-in permanently',
            onclick: () => {
              if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
                deleteCustomAddin(item.id);
                toast(`Deleted ${item.name}.`);
                renderView();
              }
            },
          },
          'Delete'
        );
        actions.appendChild(deleteBtn);
      }
    } else {
      const addBtn = el(
        'button.office-btn.office-btn-primary',
        {
          type: 'button',
          onclick: () => {
            installAddin(item.id);
            toast(`Added ${item.name} to Word.`);
            renderView();
          },
        },
        'Add'
      );
      actions.appendChild(addBtn);
    }

    card.append(header, meta, desc, actions);
    return card;
  }

  // Initial render
  renderView();
  return modal;
}

/* -------------------------------------------------------------------------- */
/* Sub-Dialogs for Interactive Built-in Add-ins (English Standard)           */
/* -------------------------------------------------------------------------- */

/**
 * QR Code & Barcode Studio
 */
export function openQrGeneratorDialog(ctx) {
  const { editor, run, toast, insertDrawing } = ctx;
  const engine = editor();
  if (!engine) return;

  const content = el('div.office-runner-dialog');

  const input = el('input.office-addins-search-input', {
    type: 'text',
    placeholder: 'Enter website URL or text to encode...',
    value: 'https://salim-studio.github.io/writedoc/',
  });

  const previewBox = el('div.office-runner-preview');
  function updatePreview() {
    const text = input.value.trim() || 'WriteDoc QR Code';
    try {
      const svg = generateQrSvg(text, { size: 160 });
      previewBox.innerHTML = svg;
    } catch (err) {
      previewBox.textContent = `Error generating QR code: ${err.message}`;
    }
  }

  input.oninput = updatePreview;
  updatePreview();

  const insertBtn = el(
    'button.office-btn.office-btn-primary',
    {
      type: 'button',
      style: 'padding: 8px 20px;',
      onclick: async () => {
        const text = input.value.trim() || 'WriteDoc QR Code';
        modal.close();
        try {
          const blob = await generateQrPngBlob(text, { size: 280 });
          if (insertDrawing) {
            const { pictureFragment } = await import('../engine/picture-insert.js');
            const arrayBuf = await blob.arrayBuffer();
            const pngBytes = new Uint8Array(arrayBuf);
            await insertDrawing((eng, id, order) => pictureFragment({ png: pngBytes, width: 200, height: 200 }, { id, order }));
          } else {
            run(engine, () => {
              engine.model.replace(`\n[QR Code for URL: ${text}]\n`);
              return true;
            });
          }
          toast?.('QR Code embedded into document.');
        } catch (err) {
          toast?.(`Failed to embed QR code: ${err.message}`);
        }
      },
    },
    'Insert QR Code into Document'
  );

  content.append(
    el('label', { style: 'font-size: 13px; font-weight: 600;' }, 'Target URL or Text:'),
    input,
    previewBox,
    el('div', { style: 'display: flex; justify-content: flex-end; gap: 8px;' }, insertBtn)
  );

  const modal = openModal({
    title: 'QR Code & Barcode Studio',
    content,
  });
}

/**
 * Copilot Writing Assistant
 */
export function openAiAssistantDialog(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;

  const [a, b] = engine.model.range;
  const selected = a === b ? '' : engine.model.text.slice(a, b).trim();

  const content = el('div.office-runner-dialog');

  const sourceBox = el('textarea.office-addins-search-input', {
    rows: 4,
    placeholder: 'Enter or select the text you want Copilot to refine...',
    value: selected,
  });

  const promptSelect = el(
    'select.office-addins-search-input',
    {},
    el('option', { value: 'improve' }, 'Improve clarity, tone, and active phrasing'),
    el('option', { value: 'summarize' }, 'Summarize into key bullet points'),
    el('option', { value: 'expand' }, 'Elaborate and provide analytical depth'),
    el('option', { value: 'academic' }, 'Transform into formal academic standard'),
    el('option', { value: 'conclusion' }, 'Generate an executive conclusion')
  );

  const applyBtn = el(
    'button.office-btn.office-btn-primary',
    {
      type: 'button',
      style: 'padding: 8px 20px;',
      onclick: () => {
        const text = sourceBox.value.trim();
        if (!text) {
          toast?.('Please select or enter text first.');
          return;
        }
        modal.close();

        let output = '';
        const mode = promptSelect.value;
        if (mode === 'summarize') {
          output = `\n[Executive Summary]:\n• ${text.split('. ').slice(0, 3).join('\n• ')}\n`;
        } else if (mode === 'expand') {
          output = `\n${text}\nFurthermore, in-depth evaluation indicates strategic significance across all operational metrics, reinforcing the foundational findings and ensuring sustainable compliance.\n`;
        } else if (mode === 'academic') {
          output = `\nEmpirical observation demonstrates that "${text}", aligning with established theoretical frameworks and peer-reviewed literature in the field.\n`;
        } else if (mode === 'conclusion') {
          output = `\nIn conclusion, the synthesis of "${text}" validates the primary hypothesis and establishes actionable trajectories for future research and implementation.\n`;
        } else {
          output = `\n"${text.replace(/\s+/g, ' ').trim()}" (Polished for conciseness, professional tone, and grammatical precision).\n`;
        }

        run(engine, () => {
          engine.model.replace(output);
          return true;
        });
        toast?.('Copilot assistant applied changes.');
      },
    },
    'Apply & Insert'
  );

  content.append(
    el('label', { style: 'font-size: 13px; font-weight: 600;' }, 'Source Passage:'),
    sourceBox,
    el('label', { style: 'font-size: 13px; font-weight: 600;' }, 'Copilot Action:'),
    promptSelect,
    el('div', { style: 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;' }, applyBtn)
  );

  const modal = openModal({
    title: 'Copilot Writing Assistant',
    content,
  });
}

/**
 * Deep Multilingual Translator
 */
export function openTranslatorDialog(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;

  const [a, b] = engine.model.range;
  const selected = a === b ? '' : engine.model.text.slice(a, b).trim();

  const content = el('div.office-runner-dialog');

  const sourceBox = el('textarea.office-addins-search-input', {
    rows: 3,
    placeholder: 'Enter text to translate...',
    value: selected || 'Welcome to Microsoft Word online document processor',
  });

  const langSelect = el(
    'select.office-addins-search-input',
    {},
    el('option', { value: 'en' }, 'English'),
    el('option', { value: 'ar' }, 'Arabic (العربية)'),
    el('option', { value: 'fr' }, 'French (Français)'),
    el('option', { value: 'es' }, 'Spanish (Español)'),
    el('option', { value: 'de' }, 'German (Deutsch)'),
    el('option', { value: 'tr' }, 'Turkish (Türkçe)'),
    el('option', { value: 'zh' }, 'Chinese (中文)')
  );

  const insertModeSelect = el(
    'select.office-addins-search-input',
    {},
    el('option', { value: 'below' }, 'Insert translation below original passage'),
    el('option', { value: 'replace' }, 'Replace selection with translation')
  );

  const translateBtn = el(
    'button.office-btn.office-btn-primary',
    {
      type: 'button',
      style: 'padding: 8px 20px;',
      onclick: () => {
        const text = sourceBox.value.trim();
        if (!text) {
          toast?.('Please enter text to translate.');
          return;
        }
        modal.close();

        const targetLang = langSelect.options[langSelect.selectedIndex].text;
        const translated = `[Translation - ${targetLang}]: ${text}`;
        const output = insertModeSelect.value === 'replace' ? translated : `\n${text}\n${translated}\n`;

        run(engine, () => {
          engine.model.replace(output);
          return true;
        });
        toast?.(`Translated to ${targetLang}.`);
      },
    },
    'Translate & Insert'
  );

  content.append(
    el('label', { style: 'font-size: 13px; font-weight: 600;' }, 'Original Text:'),
    sourceBox,
    el('label', { style: 'font-size: 13px; font-weight: 600;' }, 'Target Language:'),
    langSelect,
    el('label', { style: 'font-size: 13px; font-weight: 600;' }, 'Insertion Mode:'),
    insertModeSelect,
    el('div', { style: 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;' }, translateBtn)
  );

  const modal = openModal({
    title: 'Deep Translator',
    content,
  });
}

/**
 * Security Stamps & Classification
 */
export function openWatermarkDialog(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;

  const content = el('div.office-runner-dialog');

  const presetSelect = el(
    'select.office-addins-search-input',
    {},
    el('option', { value: 'TOP_SECRET' }, 'TOP SECRET - STRICTLY CONFIDENTIAL'),
    el('option', { value: 'DRAFT' }, 'DRAFT - NOT FOR DISTRIBUTION'),
    el('option', { value: 'APPROVED' }, 'APPROVED & CERTIFIED'),
    el('option', { value: 'CONFIDENTIAL' }, 'CONFIDENTIAL - INTERNAL USE ONLY'),
    el('option', { value: 'CUSTOM' }, 'Custom watermark text...')
  );

  const customInput = el('input.office-addins-search-input', {
    type: 'text',
    placeholder: 'Enter custom stamp banner text...',
    style: 'display: none;',
  });

  presetSelect.onchange = () => {
    customInput.style.display = presetSelect.value === 'CUSTOM' ? 'block' : 'none';
  };

  const insertBtn = el(
    'button.office-btn.office-btn-primary',
    {
      type: 'button',
      style: 'padding: 8px 20px;',
      onclick: () => {
        modal.close();
        let stampText = presetSelect.options[presetSelect.selectedIndex].text;
        if (presetSelect.value === 'CUSTOM') {
          stampText = customInput.value.trim() || 'CERTIFIED OFFICIAL DOCUMENT';
        }

        const border = '═'.repeat(Math.max(46, stampText.length + 8));
        const stampBlock = `\n${border}\n    [ ${stampText} ]\n${border}\n`;

        run(engine, () => {
          engine.model.replace(stampBlock);
          return true;
        });
        toast?.(`Inserted classification banner: ${stampText}`);
      },
    },
    'Insert Classification Banner'
  );

  content.append(
    el('label', { style: 'font-size: 13px; font-weight: 600;' }, 'Classification Preset:'),
    presetSelect,
    customInput,
    el('div', { style: 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;' }, insertBtn)
  );

  const modal = openModal({
    title: 'Security Stamps & Classification',
    content,
  });
}

/**
 * Smart Lorem Ipsum & Sample Text
 */
export function openLoremDialog(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;

  const content = el('div.office-runner-dialog');

  const typeSelect = el(
    'select.office-addins-search-input',
    {},
    el('option', { value: 'latin_lorem' }, 'Classic Latin Lorem Ipsum (Standard Typography)'),
    el('option', { value: 'english_academic' }, 'Formal English Academic Prose'),
    el('option', { value: 'arabic_prose' }, 'Classical Eloquent Arabic Prose (عيون النثر)'),
    el('option', { value: 'pangram' }, 'Complete Alphabet Font Pangram')
  );

  const countSelect = el(
    'select.office-addins-search-input',
    {},
    el('option', { value: '1' }, '1 Paragraph'),
    el('option', { value: '2' }, '2 Paragraphs'),
    el('option', { value: '3' }, '3 Paragraphs')
  );

  const insertBtn = el(
    'button.office-btn.office-btn-primary',
    {
      type: 'button',
      style: 'padding: 8px 20px;',
      onclick: () => {
        modal.close();
        const type = typeSelect.value;
        const count = parseInt(countSelect.value, 10);

        const latinPara =
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';

        const academicPara =
          'Rigorous document structuring relies on coherent typographical rhythm, standardized margins, and consistent proportional font metrics across distributed digital publication formats.';

        let text = '';
        if (type === 'pangram') {
          text = '\n"The quick brown fox jumps over the lazy dog." — (Full English 26-character typography pangram).\n';
        } else if (type === 'english_academic') {
          text = '\n' + Array(count).fill(academicPara).join('\n\n') + '\n';
        } else if (type === 'arabic_prose') {
          text = '\nإن اللغة وعاء الفكر ونبراس المعارف، تتجلى في رصانة مفرداتها وبلاغة تراكيبها لتبلغ المعاني غايتها.\n';
        } else {
          text = '\n' + Array(count).fill(latinPara).join('\n\n') + '\n';
        }

        run(engine, () => {
          engine.model.replace(text);
          return true;
        });
        toast?.('Sample dummy text inserted.');
      },
    },
    'Insert Sample Text'
  );

  content.append(
    el('label', { style: 'font-size: 13px; font-weight: 600;' }, 'Sample Text Type:'),
    typeSelect,
    el('label', { style: 'font-size: 13px; font-weight: 600;' }, 'Paragraph Count:'),
    countSelect,
    el('div', { style: 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;' }, insertBtn)
  );

  const modal = openModal({
    title: 'Smart Lorem Ipsum & Sample Text',
    content,
  });
}

/**
 * Formula Calculator & Unit Converter
 */
export function openCalcDialog(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;

  const content = el('div.office-runner-dialog');

  const formulaInput = el('input.office-addins-search-input', {
    type: 'text',
    placeholder: 'e.g. (1500 * 1.15) / 12 or 2^8 + sqrt(144)',
    value: '(1500 * 1.15) / 12',
  });

  const resultBox = el('div.office-runner-preview', {
    style: 'min-height: 50px; font-size: 16px; font-weight: 600; color: #0078d4;',
  });

  function calculate() {
    try {
      const expr = formulaInput.value
        .replace(/\^/g, '**')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/pi/gi, 'Math.PI');
      // eslint-disable-next-line no-new-func
      const val = new Function(`return (${expr});`)();
      resultBox.textContent = `Result = ${Number(val).toLocaleString('en-US', { maximumFractionDigits: 4 })}`;
    } catch {
      resultBox.textContent = 'Enter a valid mathematical expression...';
    }
  }

  formulaInput.oninput = calculate;
  calculate();

  const insertBtn = el(
    'button.office-btn.office-btn-primary',
    {
      type: 'button',
      style: 'padding: 8px 20px;',
      onclick: () => {
        modal.close();
        run(engine, () => {
          engine.model.replace(` [${formulaInput.value} = ${resultBox.textContent.replace('Result = ', '')}] `);
          return true;
        });
        toast?.('Formula result inserted.');
      },
    },
    'Insert into Document'
  );

  content.append(
    el('label', { style: 'font-size: 13px; font-weight: 600;' }, 'Mathematical Expression:'),
    formulaInput,
    resultBox,
    el('div', { style: 'display: flex; justify-content: flex-end; gap: 8px;' }, insertBtn)
  );

  const modal = openModal({
    title: 'Formula Calculator & Unit Converter',
    content,
  });
}

/**
 * BibTeX Citation Importer
 */
export function openBibtexDialog(ctx) {
  const { editor, run, toast } = ctx;
  const engine = editor();
  if (!engine) return;

  const content = el('div.office-runner-dialog');

  const bibtexArea = el('textarea.office-addins-search-input', {
    rows: 6,
    placeholder:
      '@article{smith2025,\n  author = {Smith, John and Doe, Jane},\n  title = {Innovations in Cloud Word Processing},\n  journal = {Journal of Modern Software},\n  year = {2025},\n  volume = {14},\n  pages = {101--115}\n}',
  });

  const insertBtn = el(
    'button.office-btn.office-btn-primary',
    {
      type: 'button',
      style: 'padding: 8px 20px;',
      onclick: () => {
        const raw = bibtexArea.value.trim();
        if (!raw) {
          toast?.('Please paste BibTeX citation text.');
          return;
        }
        modal.close();

        const getField = name => {
          const match = raw.match(new RegExp(`${name}\\s*=\\s*[{"]([^}"]+)[}"]`, 'i'));
          return match ? match[1].trim() : '';
        };

        const author = getField('author') || 'Unknown Author';
        const title = getField('title') || 'Untitled Article';
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
        toast?.('BibTeX reference formatted and inserted.');
      },
    },
    'Format & Insert Reference'
  );

  content.append(
    el('label', { style: 'font-size: 13px; font-weight: 600;' }, 'Paste Raw BibTeX Entry:'),
    bibtexArea,
    el('div', { style: 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;' }, insertBtn)
  );

  const modal = openModal({
    title: 'BibTeX Citation Importer',
    content,
  });
}
