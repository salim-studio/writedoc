/**
 * LaTeX Equation Writing Studio & Tools for WriteDoc.
 * Provides interactive palettes, templates, live MathML preview, and bidirectional conversions.
 */
import { el, isComposing } from '../ui/dom.js';
import { formDialog } from './insert-dialogs.js';
import { iconEl } from '../ui/icons.js';
import {
  latexToLinear,
  linearToLatex,
  latexToOmml,
  ommlToLatex,
  latexToMathml,
  LATEX_CATEGORIES,
  LATEX_TEMPLATES,
  extractLatexExpressions,
} from '../engine/latex.js';
import { toast } from '../ui/toast.js';

/**
 * Inserts a snippet into a textarea at the current cursor or replaces the selection.
 * If the snippet contains placeholders like {x} or {a}, selects the first placeholder.
 */
function insertSnippetAtCursor(textarea, snippet) {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const val = textarea.value;

  const before = val.substring(0, start);
  const after = val.substring(end);

  textarea.value = before + snippet + after;

  // Find placeholder to select e.g. {a} or {x} or first brace
  const firstBrace = snippet.indexOf('{');
  if (firstBrace !== -1) {
    const closeBrace = snippet.indexOf('}', firstBrace);
    if (closeBrace !== -1 && closeBrace > firstBrace + 1) {
      textarea.setSelectionRange(start + firstBrace + 1, start + closeBrace);
    } else {
      textarea.setSelectionRange(start + firstBrace + 1, start + firstBrace + 1);
    }
  } else {
    textarea.setSelectionRange(start + snippet.length, start + snippet.length);
  }

  textarea.focus();
}

/**
 * Opens the interactive LaTeX writing dialog with categorized palettes,
 * template formulas, syntax assist, and live MathML rendering.
 */
export function openLatexDialog({
  initial = '',
  display = false,
  onInsert,
  onClose,
  editing = false,
  openEquationDialog = null,
}) {
  // If initial looks like linear or OMML, ensure it is in LaTeX form
  let initialLatex = initial;
  if (initial && (initial.includes('■') || initial.includes('█') || initial.includes('<m:oMath') || initial.includes('/'))) {
    try {
      if (initial.includes('<m:oMath')) {
        initialLatex = ommlToLatex(initial);
      } else {
        initialLatex = linearToLatex(initial);
      }
    } catch {
      initialLatex = initial;
    }
  }

  const input = el('textarea.input.latex-editor-input', {
    rows: 4,
    'aria-label': 'LaTeX equation code',
    spellcheck: false,
    placeholder: 'Enter LaTeX equation here, e.g.: \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
    dir: 'ltr',
  }, initialLatex);

  const preview = el('div.latex-equation-preview', { 'aria-live': 'polite', dir: 'ltr' });
  const previewError = el('span.latex-preview-error', { hidden: true });
  const own = el('input', { type: 'checkbox', checked: display });

  let activeCatId = LATEX_CATEGORIES[0].id;
  const paletteContainer = el('div.latex-palette-container');
  const catNav = el('div.latex-category-nav', { role: 'tablist', 'aria-label': 'LaTeX Categories' });
  const paletteItemsGrid = el('div.latex-palette-items', { role: 'group' });

  // Update category navigation and palette items
  const renderPalette = () => {
    catNav.replaceChildren(
      ...LATEX_CATEGORIES.map(cat => {
        const isActive = cat.id === activeCatId;
        return el(
          'button.latex-cat-btn',
          {
            type: 'button',
            role: 'tab',
            'aria-selected': String(isActive),
            className: `latex-cat-btn ${isActive ? 'is-active' : ''}`,
            onclick: () => {
              activeCatId = cat.id;
              renderPalette();
            },
          },
          el('span.latex-cat-icon', {}, cat.icon),
          el('span.latex-cat-name', {}, cat.name)
        );
      }),
      el(
        'button.latex-cat-btn',
        {
          type: 'button',
          role: 'tab',
          'aria-selected': String(activeCatId === 'templates'),
          className: `latex-cat-btn ${activeCatId === 'templates' ? 'is-active' : ''}`,
          onclick: () => {
            activeCatId = 'templates';
            renderPalette();
          },
        },
        iconEl('sparkles', 13, 1.8),
        el('span.latex-cat-name', {}, 'Templates')
      )
    );

    if (activeCatId === 'templates') {
      paletteItemsGrid.className = 'latex-palette-items is-templates';
      paletteItemsGrid.replaceChildren(
        ...LATEX_TEMPLATES.map(tpl => {
          return el(
            'button.latex-template-card',
            {
              type: 'button',
              title: tpl.desc,
              onclick: () => {
                input.value = tpl.latex;
                renderPreview();
                input.focus();
              },
            },
            el('span.latex-tpl-badge', {}, tpl.category),
            el('strong.latex-tpl-title', {}, tpl.title),
            el('code.latex-tpl-code', { dir: 'ltr' }, tpl.latex)
          );
        })
      );
    } else {
      paletteItemsGrid.className = 'latex-palette-items';
      const curCat = LATEX_CATEGORIES.find(c => c.id === activeCatId) || LATEX_CATEGORIES[0];
      paletteItemsGrid.replaceChildren(
        ...curCat.items.map(item => {
          return el(
            'button.latex-item-btn',
            {
              type: 'button',
              title: `${item.label}: ${item.snippet}`,
              onclick: () => {
                insertSnippetAtCursor(input, item.snippet);
                renderPreview();
              },
            },
            el('span.latex-item-preview', { dir: 'ltr' }, item.preview),
            el('span.latex-item-label', {}, item.label)
          );
        })
      );
    }
  };

  paletteContainer.append(catNav, paletteItemsGrid);

  // Live MathML Render
  const renderPreview = () => {
    const text = input.value.trim();
    if (!text) {
      previewError.hidden = true;
      preview.replaceChildren(
        el('span.field-hint', {}, 'Type a LaTeX equation or pick structures and templates above for live preview.')
      );
      return;
    }

    try {
      const mathml = latexToMathml(text, { display: own.checked });
      previewError.hidden = true;
      if (mathml) {
        preview.innerHTML = mathml;
      } else {
        preview.textContent = text;
      }
    } catch (err) {
      previewError.hidden = false;
      previewError.textContent = `Syntax notice: ${err.message || 'Check braces or command syntax'}`;
      try {
        // Fallback preview
        const linear = latexToLinear(text);
        preview.textContent = linear || text;
      } catch {
        preview.textContent = text;
      }
    }
  };

  // Keyboard and auto-close brackets assist
  input.addEventListener('keydown', e => {
    if (isComposing(e)) return;

    // Enter without Shift submits
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      dialog.form.requestSubmit();
      return;
    }

    // Auto-closing brackets in LaTeX editor
    const PAIRS = { '{': '}', '(': ')', '[': ']', '$': '$' };
    if (PAIRS[e.key]) {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      if (start === end) {
        e.preventDefault();
        const close = PAIRS[e.key];
        input.setRangeText(e.key + close, start, end, 'end');
        input.setSelectionRange(start + 1, start + 1);
        renderPreview();
        return;
      }
    }

    // Tab key inserts 2 spaces instead of leaving textarea
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = input.selectionStart;
      const end = input.selectionEnd;
      input.setRangeText('  ', start, end, 'end');
      renderPreview();
    }
  });

  input.addEventListener('input', renderPreview);
  own.addEventListener('change', renderPreview);

  // Quick Action Toolbar
  const copyBtn = el('button.btn.btn-outline.btn-sm', {
    type: 'button',
    style: 'display: inline-flex; align-items: center; gap: 5px;',
    onclick: async () => {
      const code = input.value.trim();
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code);
        toast('LaTeX code copied to clipboard');
      } catch {
        toast('Could not copy code');
      }
    },
  }, iconEl('copy', 13, 1.8), el('span', {}, 'Copy LaTeX'));

  const copyInlineBtn = el('button.btn.btn-outline.btn-sm', {
    type: 'button',
    onclick: async () => {
      const code = input.value.trim();
      if (!code) return;
      try {
        await navigator.clipboard.writeText(`$${code}$`);
        toast('LaTeX copied in inline format ($...$)');
      } catch {
        toast('Could not copy');
      }
    },
  }, '$...$ Inline');

  const copyDisplayBtn = el('button.btn.btn-outline.btn-sm', {
    type: 'button',
    onclick: async () => {
      const code = input.value.trim();
      if (!code) return;
      try {
        await navigator.clipboard.writeText(`$$\n${code}\n$$`);
        toast('LaTeX copied in display format ($$...$$)');
      } catch {
        toast('Could not copy');
      }
    },
  }, '$$...$$ Display');

  const clearBtn = el('button.btn.btn-ghost.btn-sm', {
    type: 'button',
    style: 'display: inline-flex; align-items: center; gap: 4px;',
    onclick: () => {
      input.value = '';
      renderPreview();
      input.focus();
    },
  }, iconEl('trash', 13, 1.8), el('span', {}, 'Clear'));

  const switchLinearBtn = el('button.btn.btn-ghost.btn-sm', {
    type: 'button',
    title: 'Switch to Linear Equation Editor',
    style: 'display: inline-flex; align-items: center; gap: 4px;',
    onclick: () => {
      if (typeof openEquationDialog === 'function') {
        const linear = latexToLinear(input.value);
        dialog.modal.close();
        openEquationDialog({
          initial: linear,
          display: own.checked,
          onInsert,
          onClose,
          editing,
        });
      }
    },
  }, iconEl('refresh', 13, 1.8), el('span', {}, 'Linear Format'));

  const toolbar = el('div.latex-editor-toolbar', {},
    el('div.latex-toolbar-group', {}, copyBtn, copyInlineBtn, copyDisplayBtn),
    el('div.latex-toolbar-group', {}, clearBtn, openEquationDialog ? switchLinearBtn : null)
  );

  const previewBox = el('div.latex-preview-wrapper', {},
    el('div.latex-preview-header', {},
      el('span.field-label', {}, 'Live MathML Preview'),
      previewError
    ),
    preview
  );

  const dialog = formDialog({
    title: editing ? 'Edit LaTeX Equation' : 'LaTeX Equation Tools',
    submit: editing ? 'Update Equation' : 'Insert Equation',
    wide: true,
    className: 'insert-latex-dialog',
    onClose,
    content: [
      paletteContainer,
      el('div.latex-editor-section', {},
        el('div.latex-editor-header', {},
          el('span.field-label', {}, 'LaTeX Code Editor'),
          toolbar
        ),
        input,
        el('p.field-hint', {}, 'Supports standard LaTeX math: fractions, roots, subscripts/superscripts, matrices, Greek letters, and blackboard bold (\\mathbb{R}).')
      ),
      previewBox,
      el('label.ed-check.latex-display-check', {}, own, 'Display on its own line (Display Equation)')
    ],
    onSubmit: () => {
      const text = input.value.trim();
      if (!text) throw new Error('Please enter a LaTeX equation before inserting.');
      const linear = latexToLinear(text);
      return onInsert({ linear, display: own.checked, latex: text });
    },
  });

  renderPalette();
  renderPreview();
  input.focus();
  input.select();
  return dialog.modal;
}

/**
 * Scans the entire active document for inline ($...$) and display ($$...$$ or \[...\])
 * LaTeX math markup and converts each occurrence into a native Word Office Math object.
 */
export function convertDocumentLatex(engine) {
  if (!engine?.model) {
    toast('Document is not open or ready.');
    return 0;
  }

  engine.finishComposition();
  const text = engine.model.text;
  const expressions = extractLatexExpressions(text);

  if (!expressions.length) {
    toast('No LaTeX math expressions ($...$ or $$...$$) found in document.');
    return 0;
  }

  // Process expressions in reverse order so character offsets remain valid
  let converted = 0;
  engine.model.checkpoint();

  for (let i = expressions.length - 1; i >= 0; i--) {
    const expr = expressions[i];
    try {
      const xml = latexToOmml(expr.latex, { display: expr.display });
      const textRep = expr.latex || 'Equation';

      engine.model.select(expr.start, expr.end);
      engine.model.insertMathRun({ xml, text: textRep });
      converted++;
    } catch (e) {
      console.warn('Could not convert expression:', expr.raw, e);
    }
  }

  if (converted > 0) {
    toast(`Successfully converted ${converted} LaTeX equation(s) to native Word math!`);
  }
  return converted;
}
