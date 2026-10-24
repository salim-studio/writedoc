import { describe, it, expect, beforeEach } from 'vitest';
import {
  BUILTIN_ADDINS,
  getAllAddins,
  getInstalledAddins,
  isAddinInstalled,
  installAddin,
  uninstallAddin,
  requestAddin,
  deleteCustomAddin,
  executeAddin,
  clearAddinStorageForTesting,
} from '../src/engine/addins.js';
import { generateQrMatrix, generateQrSvg } from '../src/engine/qr-encoder.js';

describe('Add-ins Engine & Store', () => {
  beforeEach(() => {
    clearAddinStorageForTesting();
  });

  it('provides a rich built-in catalog of productive tools', () => {
    expect(BUILTIN_ADDINS.length).toBeGreaterThanOrEqual(10);
    const ids = BUILTIN_ADDINS.map(a => a.id);
    expect(ids).toContain('ai_assistant');
    expect(ids).toContain('quick_translator');
    expect(ids).toContain('qr_generator');
    expect(ids).toContain('arabic_lorem');
    expect(ids).toContain('watermark_stamp');
    expect(ids).toContain('sci_calc');
    expect(ids).toContain('signature_block');
    expect(ids).toContain('bibtex_manager');
    expect(ids).toContain('pomodoro_timer');
    expect(ids).toContain('code_formatter');
    expect(ids).toContain('decision_matrix');
  });

  it('defaults to installing core add-ins on first launch', () => {
    const installed = getInstalledAddins();
    expect(installed.length).toBeGreaterThanOrEqual(4);
    expect(isAddinInstalled('ai_assistant')).toBe(true);
    expect(isAddinInstalled('qr_generator')).toBe(true);
    expect(isAddinInstalled('arabic_lorem')).toBe(true);
  });

  it('can install and uninstall an add-in', () => {
    uninstallAddin('ai_assistant');
    expect(isAddinInstalled('ai_assistant')).toBe(false);

    installAddin('ai_assistant');
    expect(isAddinInstalled('ai_assistant')).toBe(true);
  });

  it('dynamically creates and registers a user-requested add-in into the library', () => {
    const custom = requestAddin({
      name: 'مساعد تدقيق العقود الذكي',
      nameEn: 'Smart Contract Auditor',
      description: 'أداة مخصصة لتدقيق ومراجعة البنود القانونية في العقود.',
      category: 'productivity',
      icon: '⚖️',
      actionType: 'template',
      templateText: 'العقد المبرم بتاريخ {date} بشأن {selection}.',
    });

    expect(custom.id).toMatch(/^addin_custom_/);
    expect(custom.custom).toBe(true);
    expect(custom.name).toBe('مساعد تدقيق العقود الذكي');

    // It is immediately installed
    expect(isAddinInstalled(custom.id)).toBe(true);

    // It is included in getAllAddins()
    const all = getAllAddins();
    expect(all.some(a => a.id === custom.id)).toBe(true);

    // It is included in getInstalledAddins()
    const installed = getInstalledAddins();
    expect(installed.some(a => a.id === custom.id)).toBe(true);
  });

  it('allows deleting a custom requested add-in from the library', () => {
    const custom = requestAddin({
      name: 'أداة تجريبية مؤقتة',
      description: 'وصف تجريبي',
      category: 'tools',
      actionType: 'template',
    });

    expect(getAllAddins().some(a => a.id === custom.id)).toBe(true);
    deleteCustomAddin(custom.id);

    expect(getAllAddins().some(a => a.id === custom.id)).toBe(false);
    expect(isAddinInstalled(custom.id)).toBe(false);
  });

  it('executes custom template add-in and replaces placeholders', async () => {
    const custom = requestAddin({
      name: 'قالب ملخص التقرير',
      category: 'productivity',
      actionType: 'template',
      templateText: 'ملخص التقرير بتاريخ {date} للموضوع: {selection}',
    });

    let replacedText = '';
    const sampleText = 'بيانات المبيعات السنوية';
    const fakeEngine = {
      model: {
        range: [0, sampleText.length],
        text: sampleText,
        replace(t) {
          replacedText = t;
        },
      },
    };

    const ctx = {
      editor: () => fakeEngine,
      run: (eng, fn) => fn(),
      toast: () => {},
    };

    await executeAddin(custom, ctx);
    expect(replacedText).toContain('ملخص التقرير بتاريخ');
    expect(replacedText).toContain('بيانات المبيعات السنوية');
  });

  it('generates valid QR matrix and SVG without crashing', () => {
    const matrix = generateQrMatrix('https://salim-studio.github.io/writedoc/');
    expect(matrix.length).toBeGreaterThanOrEqual(21);
    expect(Array.isArray(matrix[0])).toBe(true);

    const svg = generateQrSvg('Hello WriteDoc Add-ins');
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox');
  });
});
