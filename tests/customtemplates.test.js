import { describe, it, expect } from 'vitest';
import { customTemplateId, customTemplatePath, customTemplatesFrom, customTemplateItems, templatePathFor, TEMPLATE_FOLDER } from '../src/lib/customtemplates.js';

describe('custom templates', () => {
  it('round-trips ids and tells them from built-in ones', () => {
    const id = customTemplateId('writedoc/Templates/Invoice.docx');
    expect(id).toBe('file:writedoc/Templates/Invoice.docx');
    expect(customTemplatePath(id)).toBe('writedoc/Templates/Invoice.docx');
    expect(customTemplatePath('letter')).toBeNull();
    expect(customTemplatePath('file:')).toBeNull();
    expect(customTemplatePath(null)).toBeNull();
    expect(TEMPLATE_FOLDER).toBe('writedoc/Templates');
    expect(templatePathFor('Invoice')).toBe('writedoc/Templates/Invoice.docx');
    expect(templatePathFor('Invoice.docx')).toBe('writedoc/Templates/Invoice.docx');
  });

  it('keeps the DOCX files of a folder listing, A to Z', () => {
    const list = customTemplatesFrom([
      { name: 'Zeta.docx', path: 'writedoc/Templates/Zeta.docx', modified: 5 },
      { name: 'notes.txt', path: 'writedoc/Templates/notes.txt' },
      { name: 'Sub', path: 'writedoc/Templates/Sub', isDir: true },
      { name: 'alpha 2.docx', path: 'writedoc/Templates/alpha 2.docx', modified: 9 },
      { name: 'alpha 10.docx', path: 'writedoc/Templates/alpha 10.docx' },
    ]);
    expect(list.map((t) => t.name)).toEqual(['alpha 2', 'alpha 10', 'Zeta']);
    expect(list[2]).toEqual({ id: 'file:writedoc/Templates/Zeta.docx', name: 'Zeta', path: 'writedoc/Templates/Zeta.docx', modified: 5 });
    expect(customTemplatesFrom(null)).toEqual([]);
  });

  it('builds menu items after the built-in templates, with a manage entry when asked', () => {
    const picked = [];
    const templates = customTemplatesFrom([{ name: 'Invoice.docx', path: 'writedoc/Templates/Invoice.docx' }]);
    const items = customTemplateItems(templates, { onPick: (id) => picked.push(id), onManage: () => picked.push('manage') });
    expect(items[0]).toEqual({ separator: true });
    expect(items[1]).toEqual({ header: 'My templates' });
    expect(items[2].label).toBe('Invoice');
    items[2].onSelect();
    items[3].onSelect();
    expect(picked).toEqual(['file:writedoc/Templates/Invoice.docx', 'manage']);
    expect(customTemplateItems([], { onPick: () => {} })).toEqual([]);
    expect(customTemplateItems(templates, { onPick: () => {} })).toHaveLength(3);
  });
});

describe('template ids and paths', () => {
  it('gives a template listed from the drive root an id the app can open', () => {
    const [t] = customTemplatesFrom([{ name: 'Letter.docx', path: '/demo/AppData/app-907541aa/writedoc/Templates/Letter.docx' }]);
    expect(t.id).toBe('file:writedoc/Templates/Letter.docx');
    expect(t.path).toBe('/demo/AppData/app-907541aa/writedoc/Templates/Letter.docx');
    expect(customTemplatePath(t.id)).toBe('writedoc/Templates/Letter.docx');
  });

  it('opens only a DOCX or DOTX file inside the Templates folder, however the folder is spelled', () => {
    expect(customTemplatePath('file:writedoc/Templates/Letter.docx')).toBe('writedoc/Templates/Letter.docx');
    expect(customTemplatePath('file:/nj/writedoc/Templates/Letter.dotx')).toBe('/nj/writedoc/Templates/Letter.dotx');
    for (const outside of ['file:/etc/passwd', 'file:writedoc/Report.docx', 'file:writedoc/../x.docx', 'file:writedoc/Templates/../Report.docx', 'file:writedoc/Templates/sub/Letter.docx', 'file:writedoc/Templates/notes.txt', 'file:', 'letter']) {
      expect(customTemplatePath(outside)).toBeNull();
    }
  });
});
